import nodemailer from 'nodemailer';
import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { EMAIL_QUEUE, emailQueue } from '../queues/email.queue';
import { notifyRateLimit } from '../services/slack.service';
import { indexEmail } from '../services/elasticsearch.service';

const transport = env.smtpUser
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: false,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    })
  : nodemailer.createTransport({
      jsonTransport: true,
    });

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reserve the next sending slot for a sender.
 * This prevents multiple workers from sending too close together.
 */
async function reserveSlot(sender: string, delayMs: number) {
  const key = `sender:next:${sender}`;

  const script = `
    local now = tonumber(ARGV[1])
    local gap = tonumber(ARGV[2])
    local old = tonumber(redis.call('GET', KEYS[1]) or '0')
    local slot = math.max(now, old)
    redis.call('SET', KEYS[1], slot + gap)
    return slot - now
  `;

  const wait = Number(
    await redis.eval(script, 1, key, Date.now(), delayMs)
  );

  if (wait > 0) {
    await sleep(wait);
  }
}

/**
 * Check hourly sending limit.
 * If the limit is reached, the job is rescheduled
 * instead of being permanently dropped.
 */
async function checkHourlyLimit(
  tenantId: string,
  sender: string,
  limit: number
) {
  const hour = Math.floor(Date.now() / 3600000);
  const key = `rate:${tenantId}:${sender}:${hour}`;

  const count = await redis.incr(key);

  await redis.expire(key, 7200);

  if (count <= limit) {
    return;
  }

  if (count === limit + 1) {
    await notifyRateLimit(tenantId, sender, limit);
  }

  // Undo the increment because this email was not sent.
  await redis.decr(key);

  // Calculate remaining time until the next hour.
  const nextHour = (hour + 1) * 3600000;

  const delay = Math.max(
    1000,
    nextHour - Date.now()
  );

  throw new Error(
    `HOURLY_LIMIT_REACHED:${delay}`
  );
}

const worker = new Worker(
  EMAIL_QUEUE,

  async (job: Job) => {
    const {
      emailId,
      tenantId = 'demo',
      hourlyLimit = env.hourlyLimit,
      delayMs = env.delayMs,
    } = job.data;

    const email = await prisma.email.findUnique({
      where: {
        id: emailId,
      },
    });

    if (!email) {
      return;
    }

    // Idempotency guard.
    // If already sent, do nothing.
    if (email.status === 'SENT') {
      return;
    }

    await prisma.email.update({
      where: {
        id: emailId,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    // Check hourly limit before sending.
    await checkHourlyLimit(
      tenantId,
      email.sender,
      Number(hourlyLimit) || env.hourlyLimit
    );

    // Enforce minimum delay between emails from the same sender.
    await reserveSlot(
      email.sender,
      Number(delayMs) || env.delayMs
    );

    try {
      const info = await transport.sendMail({
        from: email.sender,
        to: email.recipient,
        subject: email.subject,
        text: email.body,
      });

      // Show Ethereal preview URL.
      const previewUrl =
        nodemailer.getTestMessageUrl(info);

      if (previewUrl) {
        console.log(
          `Ethereal preview: ${previewUrl}`
        );
      }

      // Mark email as sent.
      const sent = await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          error: null,
        },
      });

      // Index email in Elasticsearch.
      await indexEmail(sent);

      return info.messageId || 'sent';
    } catch (error: any) {
      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: 'FAILED',
          error:
            error?.message ||
            'Email sending failed',
        },
      });

      throw error;
    }
  },

  {
    connection: redis,

    concurrency: env.concurrency,

    settings: {
      backoffStrategy: (
        attemptsMade: number
      ) => {
        return Math.min(
          5000 *
            Math.pow(2, attemptsMade),
          60000
        );
      },
    },
  }
);

/**
 * Handle rate-limit failures.
 *
 * IMPORTANT:
 * We use emailQueue.add() instead of
 * job.queue.add(), because the BullMQ Job
 * object does not expose queue.add() here.
 */
worker.on(
  'failed',
  async (job, error) => {
    if (!job) {
      return;
    }

    if (
      error.message.startsWith(
        'HOURLY_LIMIT_REACHED:'
      )
    ) {
      const delay = Number(
        error.message.split(':')[1]
      );

      try {
        // Remove the failed job.
        await job.remove();

        // Re-add the same email as a delayed job.
        await emailQueue.add(
          job.name,
          job.data,
          {
            jobId: `${job.id}:rescheduled:${Date.now()}`,
            delay,
            removeOnComplete: true,
            removeOnFail: false,
          }
        );

        console.log(
          `Rate limit reached. Email ${
            job.data.emailId
          } rescheduled in ${Math.ceil(
            delay / 1000
          )} seconds.`
        );
      } catch (rescheduleError) {
        console.error(
          'Failed to reschedule rate-limited email:',
          rescheduleError
        );
      }
    } else {
      console.error(
        `Email job ${job.id} failed:`,
        error.message
      );
    }
  }
);

console.log(
  `Email worker running. concurrency=${env.concurrency}, delay=${env.delayMs}ms, hourlyLimit=${env.hourlyLimit}`
);