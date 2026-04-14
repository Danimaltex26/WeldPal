// POST /api/reference/query — search weld_reference table, fall back to Claude on miss.
// GET  /api/reference/browse — filter list for browse mode.
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { REFERENCE_SYSTEM_PROMPT } from "../prompts/reference.js";
import { callClaude } from "../utils/claudeClient.js";
import { requiresSpecificClause } from "../utils/modelRouter.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

router.post("/query", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "A query string is required" });
    }
    const searchTerm = query.trim();

    // STEP 1 — fuzzy match the existing weld_reference table
    let matches = [];
    const { data: byTitle } = await supabaseService
      .from("weld_reference")
      .select("*")
      .ilike("title", `%${searchTerm}%`)
      .limit(5);
    if (byTitle && byTitle.length) matches = byTitle;

    if (!matches.length) {
      const { data: byProcess } = await supabaseService
        .from("weld_reference")
        .select("*")
        .ilike("process", `%${searchTerm}%`)
        .limit(5);
      if (byProcess && byProcess.length) matches = byProcess;
    }

    if (!matches.length) {
      const { data: byMat } = await supabaseService
        .from("weld_reference")
        .select("*")
        .ilike("base_material", `%${searchTerm}%`)
        .limit(5);
      if (byMat && byMat.length) matches = byMat;
    }

    if (matches.length > 0) {
      const match = matches[0];
      await supabaseService
        .from("weld_reference")
        .update({ query_count: (match.query_count || 0) + 1 })
        .eq("id", match.id);
      return res.json({ result: match, source: "database" });
    }

    // SUBSCRIPTION GATE: only AI calls are gated. DB lookups stay free forever.
    if (req.profile.subscription_tier === "free") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabaseService
        .from("reference_queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 5) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 5 AI reference lookups per month. Upgrade to Pro for unlimited access.",
          limit: 5,
          used: count,
        });
      }
    }

    // STEP 2 — no DB match, ask Claude
    // CLAUDE API CALL — generate a new reference entry
    var feature = requiresSpecificClause(searchTerm) ? 'code_citation' : 'reference_lookup';
    var aiResult = await callClaude({
      feature: feature,
      systemPrompt: REFERENCE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });

    const rawText = aiResult.content;
    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Reference parse error:", rawText);
      return res.status(500).json({ error: "Failed to parse reference result", raw: rawText });
    }

    // STEP 3 — write the AI-generated entry back so the DB self-grows
    const { data: inserted, error: insertError } = await supabaseService
      .from("weld_reference")
      .insert({
        category: result.category,
        title: result.title,
        process: result.process,
        base_material: result.base_material,
        specification: result.specification,
        content_json: result.content,
        source: "ai_generated",
        query_count: 1,
      })
      .select()
      .single();

    if (insertError) console.error("Reference insert error:", insertError);

    await supabaseService.from("reference_queries").insert({ user_id: userId, query: searchTerm, source: "ai" });
    return res.json({ result: inserted || result, source: "ai", model: aiResult.model });
  } catch (err) {
    console.error("Reference query error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/browse", auth, async (req, res) => {
  try {
    const { category, process, base_material } = req.query;
    let q = supabaseService.from("weld_reference").select("*").order("query_count", { ascending: false }).limit(50);
    if (category) q = q.eq("category", category);
    if (process) q = q.ilike("process", `%${process}%`);
    if (base_material) q = q.ilike("base_material", `%${base_material}%`);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ results: data });
  } catch (err) {
    console.error("Reference browse error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
