// Generate and seed training questions for WeldPal via Claude API
// Run: node seeds/seedQuestions.js [CERT_LEVEL]

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert AWS welding certification instructor with 20+ years of experience training and examining welders and inspectors at all levels from CW through CRAW. You have deep knowledge of AWS D1.1, ASME Section IX, API 1104, and AWS QC1 standards.

Generate multiple choice exam questions for the {cert_level} certification exam.

Module: {module_title}
Topic: {specific_topic}
Difficulty level: {difficulty}
Number of questions needed: {count}

DIFFICULTY DEFINITIONS:
foundation — recall of key facts, definitions, and specifications.
applied — applying knowledge to a realistic field scenario or performing a calculation.
analysis — interpreting test results, diagnosing a problem, or evaluating competing options.

Return ONLY a valid JSON array. No preamble, no markdown, no explanation outside the JSON. Each element:
{
  "question_text": "string",
  "option_a": "string",
  "option_b": "string",
  "option_c": "string",
  "option_d": "string",
  "correct_answer": "A | B | C | D",
  "explanation": "string — min 80 words, explains correct AND why each wrong answer is wrong",
  "standard_reference": "string or null",
  "difficulty": "foundation | applied | analysis",
  "topic": "string"
}

CRITICAL RULES:
- Wrong answers must be plausible — use common misconceptions, close numerical values, or real alternatives
- Never use "none of the above" as a filler
- Applied/analysis questions must describe realistic field scenarios
- Use actual specification values from current AWS/ASME/API standards
- Each question must be independently answerable
- Do not duplicate questions — vary the scenario or angle`;

async function generateQuestions(certLevel, moduleTitle, topics, count) {
  const foundation = Math.round(count * 0.4);
  const applied = Math.round(count * 0.4);
  const analysis = count - foundation - applied;
  const allQuestions = [];

  for (const [difficulty, diffCount] of [["foundation", foundation], ["applied", applied], ["analysis", analysis]]) {
    if (diffCount <= 0) continue;
    const topicStr = topics.slice(0, 5).join(", ");
    const prompt = SYSTEM_PROMPT
      .replace("{cert_level}", certLevel).replace("{module_title}", moduleTitle)
      .replace("{specific_topic}", topicStr).replace("{difficulty}", difficulty).replace("{count}", String(diffCount));

    let retries = 0;
    while (retries < 2) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514", max_tokens: 4096,
          system: prompt,
          messages: [{ role: "user", content: `Generate ${diffCount} ${difficulty}-level questions for ${moduleTitle}. Topics: ${topicStr}` }],
        });
        const rawText = response.content[0].text;
        const stripped = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
        let parsed;
        try { parsed = JSON.parse(stripped); } catch {
          const start = stripped.indexOf("["); const end = stripped.lastIndexOf("]");
          if (start === -1 || end === -1) throw new Error("No JSON array");
          parsed = JSON.parse(stripped.slice(start, end + 1));
        }
        if (!Array.isArray(parsed)) throw new Error("Not an array");
        for (const q of parsed) {
          if (!q.question_text || !q.option_a || !q.correct_answer || !q.explanation) continue;
          if (!["A","B","C","D"].includes(q.correct_answer)) continue;
          allQuestions.push({ ...q, difficulty: q.difficulty || difficulty, topic: q.topic || topicStr });
        }
        break;
      } catch (err) {
        retries++;
        if (retries >= 2) console.error(`    [FAIL] ${difficulty} for ${moduleTitle}: ${err.message}`);
        else console.log(`    [retry] ${difficulty} attempt ${retries}...`);
      }
    }
  }
  return allQuestions;
}

async function main() {
  console.log("=== Seeding WeldPal Training Questions ===\n");
  const targetLevel = process.argv[2] || null;

  const query = supabase.from("training_modules")
    .select("id, cert_level, module_number, title, topic_list")
    .order("cert_level").order("module_number");
  if (targetLevel) query.eq("cert_level", targetLevel);

  const { data: modules, error } = await query;
  if (error || !modules) { console.error("Failed:", error?.message); return; }

  let totalSeeded = 0;
  for (const mod of modules) {
    const { count } = await supabase.from("training_questions").select("*", { count: "exact", head: true }).eq("module_id", mod.id);
    if (count >= 20) { console.log(`[skip] ${mod.cert_level} M${mod.module_number}: ${mod.title} — ${count} questions`); continue; }

    const needed = 20 - (count || 0);
    console.log(`[gen] ${mod.cert_level} M${mod.module_number}: ${mod.title} — ${needed} questions...`);
    const questions = await generateQuestions(mod.cert_level, mod.title, mod.topic_list, needed);
    if (questions.length === 0) { console.log("  [WARN] None generated"); continue; }

    const rows = questions.map(q => ({
      module_id: mod.id, cert_level: mod.cert_level, topic: q.topic,
      question_text: q.question_text, option_a: q.option_a, option_b: q.option_b,
      option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer,
      explanation: q.explanation, standard_reference: q.standard_reference || null,
      difficulty: q.difficulty, is_dynamic: false,
    }));
    const { error: ie } = await supabase.from("training_questions").insert(rows);
    if (ie) console.error(`  [ERROR] ${ie.message}`);
    else { console.log(`  [ok] ${questions.length} questions`); totalSeeded += questions.length; }
  }
  console.log(`\n=== Done — ${totalSeeded} questions seeded ===`);
}

main().catch(console.error);
