// Vercel serverless entry. Re-exports the Express app; Vercel's @vercel/node
// runtime invokes it as a (req, res) handler.
import app from "../app.js";

export default app;
