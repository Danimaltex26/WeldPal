// POST /api/troubleshoot — structured form → AI diagnosis with optional follow-up.
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { TROUBLESHOOT_SYSTEM_PROMPT } from "../prompts/troubleshoot.js";
import { callClaude } from "../utils/claudeClient.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      weld_process,
      base_material,
      filler_metal,
      position,
      symptom,
      environment,
      already_tried = [],
      current_parameters,
      follow_up,
      session_id,
    } = req.body;

    // SUBSCRIPTION GATE: free tier 5 sessions/month
    if (req.profile.subscription_tier === "free") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabaseService
        .from("troubleshoot_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 2) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 5 troubleshoot sessions per month. Upgrade to Pro for unlimited.",
        });
      }
    }

    // Load existing session for follow-up
    let existingSession = null;
    let existingHistory = [];
    if (session_id) {
      const { data, error: fetchError } = await supabaseService
        .from("troubleshoot_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", userId)
        .single();
      if (fetchError || !data) {
        return res.status(404).json({ error: "Session not found" });
      }
      existingSession = data;
      existingHistory = data.conversation_json || [];
    }

    const userMessage = session_id && follow_up
      ? follow_up
      : [
          `Welding process: ${weld_process || "not specified"}`,
          `Base material: ${base_material || "not specified"}`,
          `Filler metal: ${filler_metal || "not specified"}`,
          `Joint position: ${position || "not specified"}`,
          `Symptom: ${symptom || "not specified"}`,
          `Environment: ${environment || "not specified"}`,
          `Already tried: ${already_tried.length ? already_tried.join(", ") : "nothing yet"}`,
          `Current parameters: ${current_parameters || "not specified"}`,
        ].join("\n");

    const messages = [...existingHistory, { role: "user", content: userMessage }];

    // CLAUDE API CALL — text-only troubleshoot diagnosis
    var aiResult = await callClaude({
      feature: 'troubleshoot',
      context: { conversationHistory: existingHistory, symptom: req.body.symptom || '' },
      systemPrompt: TROUBLESHOOT_SYSTEM_PROMPT,
      messages,
    });

    const rawText = aiResult.content;
    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Parse error:", rawText);
      return res.status(500).json({ error: "Failed to parse troubleshoot result", raw: rawText });
    }

    const updatedHistory = [...messages, { role: "assistant", content: rawText }];

    const sessionPayload = {
      user_id: userId,
      weld_process: weld_process || existingSession?.weld_process,
      base_material: base_material || existingSession?.base_material,
      filler_metal: filler_metal || existingSession?.filler_metal,
      position: position || existingSession?.position,
      symptom: symptom || existingSession?.symptom,
      environment: environment || existingSession?.environment,
      already_tried: already_tried.length ? already_tried : existingSession?.already_tried,
      current_parameters: current_parameters || existingSession?.current_parameters,
      conversation_json: updatedHistory,
    };

    let savedSession;
    if (session_id && existingSession) {
      const { data } = await supabaseService
        .from("troubleshoot_sessions")
        .update(sessionPayload)
        .eq("id", session_id)
        .select()
        .single();
      savedSession = data;
    } else {
      const { data } = await supabaseService
        .from("troubleshoot_sessions")
        .insert(sessionPayload)
        .select()
        .single();
      savedSession = data;
    }

    return res.json({ result, session_id: savedSession?.id });
  } catch (err) {
    console.error("Troubleshoot error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
