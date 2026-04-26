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

    // Follow-ups need the JSON reminder appended — otherwise the model
    // drifts into conversational prose and the response won't parse.
    const userMessage = session_id && follow_up
      ? `${follow_up}\n\nRespond with a JSON object exactly matching the schema in your instructions. No prose before or after, no markdown code fences.`
      : buildTroubleshootMessage(req.body);

    const messages = [...existingHistory, { role: "user", content: userMessage }];

    // CLAUDE API CALL: WeldPal troubleshoot diagnosis
    // Model routing: simple symptoms → Haiku, complex → Sonnet
    // Complexity signals passed via context — see utils/modelRouter.js
    const troubleshootContext = {
      // Prior conversation turns — multi-turn escalates to Sonnet
      conversationHistory: existingHistory,

      // Primary symptom text for safety keyword detection
      symptom: req.body.symptom || '',

      // Code standard selected = citation accuracy needed = Sonnet
      requiresCodeCompliance: !!(req.body.code_standard &&
        req.body.code_standard !== 'Unknown'),

      // Specialty materials require advanced metallurgical knowledge
      isSpecialtyMaterial: ['stainless', 'aluminum', 'alloy steel',
        'chrome-moly', 'hsla', 'duplex', 'inconel', 'p91',
        'titanium', 'nickel', 'hastelloy', 'monel'].some(
        m => (req.body.base_material || '').toLowerCase().includes(m)
      ),

      // B31 piping codes and pressure/tank codes always require Sonnet
      isPipingOrPressureCode: !!(req.body.code_standard && (
        req.body.code_standard.includes('B31') ||
        req.body.code_standard.includes('Section VIII') ||
        req.body.code_standard.includes('Section I') ||
        req.body.code_standard.includes('API 650') ||
        req.body.code_standard.includes('API 653') ||
        req.body.code_standard.includes('API 620') ||
        req.body.code_standard.includes('D3.6') ||
        req.body.code_standard.includes('D17.1')
      )),

      // Parameters provided = quantitative diagnosis = Sonnet
      hasWeldParameters: !!(req.body.current_parameters &&
        String(req.body.current_parameters).trim()),

      // Overhead or vertical = position-specific diagnosis = Sonnet
      isDifficultPosition: ['vertical', 'overhead'].includes(
        (req.body.position || '').toLowerCase()
      ),
    };

    const aiResult = await callClaude({
      feature: 'troubleshoot',
      context: troubleshootContext,
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

    return res.json({ result, session_id: savedSession?.id, model: aiResult.model });
  } catch (err) {
    console.error("Troubleshoot error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Builds the user message from form fields.
// Maps the camelCase field names in the spec to the snake_case fields
// the frontend actually sends; gracefully handles fields the current UI
// does not yet expose (code_standard, joint_type, material_thickness, etc.)
function buildTroubleshootMessage(body) {
  const lines = [];

  if (body.weld_process) lines.push(`Welding process: ${body.weld_process}`);
  if (body.base_material) lines.push(`Base material: ${body.base_material}`);
  if (body.code_standard && body.code_standard !== 'Unknown') {
    lines.push(`Applicable code standard: ${body.code_standard}`);
  }
  if (body.filler_metal && String(body.filler_metal).trim()) {
    lines.push(`Electrode / wire: ${String(body.filler_metal).trim()}`);
  }
  if (body.joint_type) lines.push(`Joint type: ${body.joint_type}`);
  if (body.position) lines.push(`Weld position: ${body.position}`);
  if (body.material_thickness && String(body.material_thickness).trim()) {
    lines.push(`Material thickness: ${String(body.material_thickness).trim()}`);
  }
  if (body.current_parameters && String(body.current_parameters).trim()) {
    lines.push(`Current parameters: ${String(body.current_parameters).trim()}`);
  }
  if (body.environment) lines.push(`Environment: ${body.environment}`);
  if (body.already_tried && body.already_tried.length > 0) {
    lines.push(`Already tried: ${body.already_tried.join(', ')}`);
  }
  if (body.symptom && String(body.symptom).trim()) {
    lines.push(`Welder description: ${String(body.symptom).trim()}`);
  }

  const contextBlock = lines.length > 0
    ? lines.join('\n')
    : 'No additional context provided.';

  return `${contextBlock}\n\nDiagnose this weld problem and return your complete assessment as a JSON object exactly matching the schema in your instructions.`;
}

export default router;
