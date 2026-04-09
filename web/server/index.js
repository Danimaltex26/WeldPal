// WeldPal API server.
// Loads .env from project root (one level up) so client and server share the same file.
import "dotenv/config";
import express from "express";
import cors from "cors";

import weldRoutes from "./routes/weld.js";
import troubleshootRoutes from "./routes/troubleshoot.js";
import referenceRoutes from "./routes/reference.js";
import certRoutes from "./routes/cert.js";
import historyRoutes from "./routes/history.js";
import profileRoutes from "./routes/profile.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/weld", weldRoutes);
app.use("/api/troubleshoot", troubleshootRoutes);
app.use("/api/reference", referenceRoutes);
app.use("/api/cert", certRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/profile", profileRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "weldpal", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`WeldPal server listening on port ${PORT}`);
});
