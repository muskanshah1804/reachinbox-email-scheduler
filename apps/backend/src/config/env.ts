import dotenv from 'dotenv';

dotenv.config({ override: true });

export const env = {
  port: Number(process.env.PORT || 4000),

  databaseUrl: process.env.DATABASE_URL!,

  redisUrl:
    process.env.REDIS_URL ||
    'redis://localhost:6379',

  frontendUrl:
    process.env.FRONTEND_URL ||
    'http://localhost:5173',

  smtpHost:
    process.env.ETHEREAL_HOST ||
    'smtp.ethereal.email',

  smtpPort:
    Number(process.env.ETHEREAL_PORT || 587),

  smtpUser:
    process.env.ETHEREAL_USER || '',

  smtpPass:
    process.env.ETHEREAL_PASS || '',

  concurrency:
    Number(process.env.DEFAULT_CONCURRENCY || 5),

  delayMs:
    Number(process.env.DEFAULT_DELAY_MS || 2000),

  hourlyLimit:
    Number(process.env.DEFAULT_HOURLY_LIMIT || 100),

  elasticsearchUrl:
    process.env.ELASTICSEARCH_URL || '',

  googleClientId:
    process.env.GOOGLE_CLIENT_ID || '',

  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET || '',

    googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:4000/auth/google/callback',

  slackClientId:
    process.env.SLACK_CLIENT_ID || '',

  slackClientSecret:
    process.env.SLACK_CLIENT_SECRET || '',

  slackRedirectUri:
    process.env.SLACK_REDIRECT_URI ||
    'http://localhost:4000/auth/slack/callback',
};