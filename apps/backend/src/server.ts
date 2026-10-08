import express from "express";
import cors from "cors";
import passport from "passport";

import {
  createBullBoard,
} from "@bull-board/api";

import {
  BullMQAdapter,
} from "@bull-board/api/bullMQAdapter";

import {
  ExpressAdapter,
} from "@bull-board/express";

import { emailQueue } from "./queues/email.queue";
import emailRoutes from "./routes/email.routes";
import slackRoutes from "./routes/slack.routes";
import csvRoutes from "./routes/csv.routes";
import authRoutes, {
  authMiddleware,
} from "./routes/auth.routes";

import { env } from "./config/env";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5175",
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "5mb",
  })
);

// Google OAuth session
app.use(authMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "reachinbox-scheduler",
  });
});

// API routes
app.use("/api/emails", emailRoutes);
app.use("/auth/slack", slackRoutes);
app.use("/api/csv", csvRoutes);

// Google OAuth routes
app.use("/auth", authRoutes);

// BullMQ dashboard
const adapter = new ExpressAdapter();

adapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter: adapter,
});

app.use(
  "/admin/queues",
  adapter.getRouter()
);

// Start server
app.listen(env.port, () => {
  console.log(
    `API http://localhost:${env.port} | Bull Board http://localhost:${env.port}/admin/queues`
  );
});
