import { Router } from 'express';
import { prisma } from '../config/prisma';
import { scheduleEmail } from '../services/scheduler.service';
import { searchEmails } from '../services/elasticsearch.service';

const router = Router();

router.post('/schedule', async (req, res) => {
  try {
    const {
      sender,
      recipients,
      subject,
      body,
      scheduledAt,
      hourlyLimit,
      delayMs,
      tenantId,
    } = req.body;

    if (
      !sender ||
      !Array.isArray(recipients) ||
      recipients.length === 0 ||
      !subject ||
      !body ||
      !scheduledAt
    ) {
      return res.status(400).json({
        error:
          'sender, recipients, subject, body and scheduledAt are required',
      });
    }

    const date = new Date(scheduledAt);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        error: 'Invalid scheduledAt date',
      });
    }

    if (date.getTime() < Date.now()) {
      return res.status(400).json({
        error: 'scheduledAt must be in the future',
      });
    }

    const emails = [];

    for (const recipient of recipients) {
      const cleanRecipient = String(recipient).trim();

      if (!cleanRecipient) continue;

      const idempotencyKey = `${
        tenantId || 'demo'
      }:${sender}:${cleanRecipient}:${date.toISOString()}:${subject}`;

      try {
        const email = await scheduleEmail({
          sender,
          recipient: cleanRecipient,
          subject,
          body,
          scheduledAt: date,
          hourlyLimit,
          delayMs,
          tenantId,
          idempotencyKey,
        });

        emails.push(email);
      } catch (error: any) {
        // Duplicate idempotency key = already scheduled
        if (
          error?.code === 'P2002' ||
          String(error?.message || '').includes('Unique constraint')
        ) {
          continue;
        }

        throw error;
      }
    }

    return res.status(201).json({
      count: emails.length,
      emails,
    });
  } catch (error: any) {
    console.error('Schedule email error:', error);

    return res.status(500).json({
      error: error?.message || 'Failed to schedule emails',
    });
  }
});

router.get('/scheduled', async (_req, res) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    return res.json(emails);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to fetch scheduled emails',
    });
  }
});

router.get('/sent', async (_req, res) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        status: {
          in: ['SENT', 'FAILED'],
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: 500,
    });

    return res.json(emails);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to fetch sent emails',
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    if (!q) {
      return res.json([]);
    }

    const emails = await prisma.email.findMany({
      where: {
        OR: [
          {
            recipient: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            subject: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            body: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 100,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(emails);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Search failed',
    });
  }
});

export default router;