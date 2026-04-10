// Cert prep routes:
//   GET  /api/cert/questions       — fetch random questions for cert+category
//   POST /api/cert/answer          — record an answer, update progress
//   GET  /api/cert/progress        — fetch user's progress summary
//   POST /api/cert/generate        — AI generates more questions when bank is thin
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import auth from "../middleware/auth.js";
import { CERT_GENERATE_SYSTEM_PROMPT } from "../prompts/cert.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

const anthropic = new Anthropic();

// GET /api/cert/questions?cert_level=CWI&category=visual_inspection&limit=10
router.get("/questions", auth, async (req, res) => {
  try {
    const { cert_level, category, limit = 10 } = req.query;
    let q = supabaseService.from("cert_prep_questions").select("*");
    if (cert_level) q = q.eq("cert_level", cert_level);
    if (category) q = q.eq("category", category);
    const { data, error } = await q.limit(200);
    if (error) return res.status(500).json({ error: error.message });

    // randomize and slice
    const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, Number(limit));
    return res.json({ questions: shuffled });
  } catch (err) {
    console.error("Cert questions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cert/answer { question_id, selected, cert_level, category }
router.post("/answer", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { question_id, selected, cert_level, category } = req.body;

    const { data: question, error: qErr } = await supabaseService
      .from("cert_prep_questions")
      .select("*")
      .eq("id", question_id)
      .single();
    if (qErr || !question) return res.status(404).json({ error: "Question not found" });

    const correct = (selected || "").toUpperCase() === question.correct_answer;

    // Upsert progress for this cert level
    const { data: existing } = await supabaseService
      .from("cert_prep_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("cert_level", cert_level)
      .maybeSingle();

    if (existing) {
      const weak = new Set(existing.weak_categories || []);
      const strong = new Set(existing.strong_categories || []);
      if (correct) {
        strong.add(category);
        weak.delete(category);
      } else {
        weak.add(category);
      }
      await supabaseService
        .from("cert_prep_progress")
        .update({
          questions_attempted: (existing.questions_attempted || 0) + 1,
          questions_correct: (existing.questions_correct || 0) + (correct ? 1 : 0),
          weak_categories: Array.from(weak),
          strong_categories: Array.from(strong),
          last_session_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseService.from("cert_prep_progress").insert({
        user_id: userId,
        cert_level,
        questions_attempted: 1,
        questions_correct: correct ? 1 : 0,
        weak_categories: correct ? [] : [category],
        strong_categories: correct ? [category] : [],
        last_session_at: new Date().toISOString(),
      });
    }

    return res.json({
      correct,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      code_reference: question.code_reference,
    });
  } catch (err) {
    console.error("Cert answer error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cert/progress?cert_level=CWI
router.get("/progress", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cert_level } = req.query;
    let q = supabaseService.from("cert_prep_progress").select("*").eq("user_id", userId);
    if (cert_level) q = q.eq("cert_level", cert_level);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ progress: data });
  } catch (err) {
    console.error("Cert progress error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cert/generate { cert_level, category, count }
// Service role writes new questions to the bank.
router.post("/generate", auth, async (req, res) => {
  try {
    const { cert_level, category, count = 5 } = req.body;

    // CLAUDE API CALL — generate new exam questions
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: CERT_GENERATE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate ${count} new exam questions for cert level ${cert_level} in the category "${category}". Return as a JSON array.`,
        },
      ],
    });

    const rawText = message.content[0].text;
    let questions;
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      questions = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Generate parse error:", rawText);
      return res.status(500).json({ error: "Failed to parse generated questions", raw: rawText });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: "No questions returned" });
    }

    const { data: inserted, error: insertError } = await supabaseService
      .from("cert_prep_questions")
      .insert(questions)
      .select();
    if (insertError) {
      console.error("Generate insert error:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.json({ inserted: inserted.length, questions: inserted });
  } catch (err) {
    console.error("Cert generate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
