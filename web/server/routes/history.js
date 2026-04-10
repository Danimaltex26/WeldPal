// GET /api/history — combined history for the current user.
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // SUBSCRIPTION GATE: free tier sees last 10 of each
    const limit = req.profile.subscription_tier === "free" ? 10 : 100;

    const [analyses, sessions] = await Promise.all([
      supabaseService
        .from("weld_analyses")
        .select("id, created_at, image_urls, weld_process, base_material, overall_assessment, confidence, job_reference, saved, title, notes, full_response_json")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseService
        .from("troubleshoot_sessions")
        .select("id, created_at, weld_process, base_material, position, symptom, resolved, title, notes, conversation_json")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    return res.json({
      weld_analyses: analyses.data || [],
      troubleshoot_sessions: sessions.data || [],
    });
  } catch (err) {
    console.error("History error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/weld/:id — title/notes/saved/job_reference
router.patch("/weld/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { saved, job_reference, title, notes } = req.body;
    const update = {};
    if (saved !== undefined) update.saved = saved;
    if (job_reference !== undefined) update.job_reference = job_reference;
    if (title !== undefined) update.title = title;
    if (notes !== undefined) update.notes = notes;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const { error } = await supabaseService
      .from("weld_analyses")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("History patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/troubleshoot/:id — title/notes
router.patch("/troubleshoot/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const update = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.notes !== undefined) update.notes = req.body.notes;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const { error } = await supabaseService
      .from("troubleshoot_sessions")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Troubleshoot patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/troubleshoot/:id/resolve
router.patch("/troubleshoot/:id/resolve", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { error } = await supabaseService
      .from("troubleshoot_sessions")
      .update({ resolved: true })
      .eq("id", req.params.id)
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Troubleshoot resolve error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /history/weld/:id
router.delete("/weld/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { error } = await supabaseService
      .from("weld_analyses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Weld delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /history/troubleshoot/:id
router.delete("/troubleshoot/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { error } = await supabaseService
      .from("troubleshoot_sessions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Troubleshoot delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
