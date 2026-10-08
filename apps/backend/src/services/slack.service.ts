import { prisma } from '../config/prisma';

export async function notifyRateLimit(
  tenantId: string,
  sender: string,
  limit: number
) {
  const connection = await prisma.slackConnection.findUnique({
    where: { tenantId },
  });

  if (!connection) {
    console.log('Slack: no connection found for tenant:', tenantId);
    return;
  }

  try {
    const response = await fetch(connection.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `⚠️ Rate limit reached for ${sender}. Hourly limit: ${limit}. Emails will continue in the next available window.`,
      }),
    });

    const result = await response.text();

    console.log('Slack notification status:', response.status);
    console.log('Slack notification response:', result);
  } catch (error) {
    console.error('Slack notification failed:', error);
  }
}