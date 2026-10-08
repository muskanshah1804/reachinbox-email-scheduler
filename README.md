# ReachInbox.ai — Full-stack Email Job Scheduler

A full-stack email scheduling system built with React, TypeScript, Express.js, PostgreSQL, Prisma, BullMQ, Redis, Elasticsearch, Google OAuth, Slack OAuth, and Ethereal Email.

The application allows users to authenticate with Google, compose and schedule emails, upload recipients through CSV, process delayed jobs using BullMQ, enforce sender pacing and hourly rate limits, search emails using Elasticsearch, and receive Slack notifications when an hourly sending limit is reached.

---

## Features

### Authentication
- Google OAuth 2.0 login
- Login-first dashboard
- User profile information and profile picture
- Logout functionality

### Email Scheduling
- Schedule emails for a future time
- Send emails to multiple recipients
- Support multiple senders
- Configurable delay between emails
- Configurable hourly email limit
- Persistent scheduled jobs using BullMQ and Redis
- Idempotency protection to prevent duplicate scheduling

### CSV Upload
- Upload recipient CSV files
- Preview CSV data
- Validate email addresses
- Separate valid and invalid recipients

### Email Delivery
- Ethereal Email SMTP for testing
- Nodemailer for email delivery
- Email status tracking:
  - SCHEDULED
  - SENT
  - FAILED
- Retry handling for failed jobs

### Rate Limiting
- Per-sender delay control
- Redis-based hourly rate limiting
- Emails are rescheduled instead of being dropped when the limit is reached
- Slack notification when the hourly limit is reached

### Slack Integration
- Slack OAuth 2.0 integration
- Connect Slack workspace from the dashboard
- Stores the Slack incoming webhook returned by OAuth
- Sends rate-limit notifications to the connected Slack workspace

### Search
- Elasticsearch indexing
- Search emails by relevant email content
- Search API endpoint

### Monitoring
- Bull Board dashboard for BullMQ queues
- Queue and worker visibility

---

# Tech Stack

## Frontend
- React
- TypeScript
- Vite
- CSS

## Backend
- Node.js
- TypeScript
- Express.js
- Passport.js

## Database
- PostgreSQL
- Prisma ORM

## Queue
- BullMQ
- Redis

## Email
- Nodemailer
- Ethereal Email

## Search
- Elasticsearch

## Authentication
- Google OAuth 2.0
- Slack OAuth 2.0

---

# Architecture


                         ┌──────────────────────┐
                         │      Google OAuth     │
                         │    Authentication    │
                         └──────────┬───────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────┐
│                    React Dashboard                     │
│                                                        │
│ Compose Email │ CSV Upload │ Scheduled │ Sent │ Search │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Express API      │
                  │ TypeScript       │
                  └────────┬─────────┘
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
       PostgreSQL        Redis        Elasticsearch
        + Prisma        + BullMQ         Search
             │             │
             │             ▼
             │      ┌───────────────┐
             │      │ Email Worker  │
             │      └───────┬───────┘
             │              │
             │              ▼
             │       Rate Limiting
             │       Sender Delay
             │              │
             │              ▼
             │       Nodemailer
             │              │
             │              ▼
             │       Ethereal SMTP
             │
             └──────────────────────────┐
                                        ▼
                                 Email Status
                                 SENT / FAILED

                  Hourly Limit Reached
                          │
                          ▼
                    Slack OAuth
                          │
                          ▼
                 Slack Notification
