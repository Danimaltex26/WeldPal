// Express app factory. Pure config — no listen() call.
// Imported by both local dev (index.js) and the Vercel serverless entry (api/index.js).
import "dotenv/config";
import express from "express";
import cors from "cors";

import weldRoutes from "./routes/weld.js";
import troubleshootRoutes from "./routes/troubleshoot.js";
import referenceRoutes from "./routes/reference.js";
import certRoutes from "./routes/cert.js";
import historyRoutes from "./routes/history.js";
import profileRoutes from "./routes/profile.js";
import trainingRoutes from "./routes/training.js";
import teamRoutes from "./routes/teams.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import webhookRoutes from "./routes/webhooks.js";

const app = express();

// CORS: allowlist from env (comma-separated), fallback to wide-open for local dev.
// In production, set CORS_ORIGINS to:
//   https://weldpal.tradepals.net,https://tradepals.net
const allowed = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Stripe webhook needs raw body for signature verification — mount before JSON parser
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookRoutes);

app.use(express.json({ limit: "10mb" }));

app.use("/api/weld", weldRoutes);
app.use("/api/troubleshoot", troubleshootRoutes);
app.use("/api/reference", referenceRoutes);
app.use("/api/cert", certRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/webhooks", webhookRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "weldpal", timestamp: new Date().toISOString() });
});

export default app;
