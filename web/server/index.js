// Local dev entry. Vercel uses api/index.js instead.
import app from "./app.js";

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`WeldPal server listening on port ${PORT}`);
});
