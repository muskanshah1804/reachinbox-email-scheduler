import { prisma } from '../config/prisma';
import { emailQueue } from '../queues/email.queue';
import { indexEmail } from './elasticsearch.service';

export async function scheduleEmail(input: {sender:string; recipient:string; subject:string; body:string; scheduledAt:string; idempotencyKey?:string; hourlyLimit?:number; delayMs?:number; tenantId?:string}) {
  const key = input.idempotencyKey || `${input.sender}:${input.recipient}:${input.scheduledAt}:${input.subject}`;
  const existing = await prisma.email.findUnique({where:{idempotencyKey:key}});
  if (existing) return existing;
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid scheduledAt');
  const email = await prisma.email.create({data:{idempotencyKey:key,sender:input.sender,recipient:input.recipient,subject:input.subject,body:input.body,scheduledAt}});
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await emailQueue.add('send-email', { emailId: email.id, tenantId: input.tenantId || 'demo', hourlyLimit: input.hourlyLimit, delayMs: input.delayMs }, {jobId:email.id, delay, removeOnComplete:1000, removeOnFail:1000});
  await indexEmail(email);
  return email;
}
