// GET /api/history — combined history for the current user.
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // SUBSCRIPTION GATE: free tier sees last 10 of each
    const limit = req.profile.subscription_tier === "free" ? 10 : 100;

    const [analyses, sessions] = await Promise.all([
      supabaseService
        .from("weld_analyses")
        .select("id, created_at, image_urls, weld_process, base_material, overall_assessment, confidence, job_reference, saved")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseService
        .from("troubleshoot_sessions")
        .select("id, created_at, weld_process, base_material, position, symptom, resolved")
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

router.patch("/weld/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { saved, job_reference } = req.body;
    const update = {};
    if (saved !== undefined) update.saved = saved;
    if (job_reference !== undefined) update.job_reference = job_reference;

    const { data, error } = await supabaseService
      .from("weld_analyses")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ record: data });
  } catch (err) {
    console.error("History patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
