// POST /api/weld/analyze — upload weld photo(s), get AI defect analysis.
import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import auth from "../middleware/auth.js";
import { WELD_ANALYSIS_SYSTEM_PROMPT } from "../prompts/weld.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per image
});

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

const anthropic = new Anthropic();

router.post("/analyze", auth, upload.array("images", 4), async (req, res) => {
  try {
    const userId = req.user.id;
    const { weld_process, base_material, code_standard, job_reference } = req.body;

    // SUBSCRIPTION GATE: free tier capped at 5 weld analyses per month
    if (req.profile.subscription_tier === "free") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count, error: countError } = await supabaseService
        .from("weld_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);

      if (countError) {
        console.error("Count error:", countError);
        return res.status(500).json({ error: "Failed to check usage limits" });
      }
      if (count >= 2) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 2 weld analyses per month. Upgrade to Pro for unlimited.",
          limit: 2,
          used: count,
        });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    // Upload images to Supabase Storage and build Claude vision content blocks
    const imageContent = [];
    const publicUrls = [];
    for (const file of req.files) {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabaseService.storage
        .from("weldpal-uploads")
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      if (uploadError) {
        console.error("Upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload image" });
      }
      const { data: urlData } = supabaseService.storage.from("weldpal-uploads").getPublicUrl(storagePath);
      publicUrls.push(urlData.publicUrl);

      imageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimetype || "image/jpeg",
          data: file.buffer.toString("base64"),
        },
      });
    }

    // Append text instruction with user-provided context
    imageContent.push({
      type: "text",
      text: [
        "Analyze this weld photo and return your assessment as the specified JSON object.",
        `Welding process: ${weld_process || "not specified"}`,
        `Base material: ${base_material || "not specified"}`,
        `Applicable code: ${code_standard || "not specified"}`,
      ].join("\n"),
    });

    // CLAUDE API CALL — vision analysis of weld photo
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: WELD_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: imageContent }],
    });

    const rawText = message.content[0].text;
    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Parse error:", rawText);
      return res.status(500).json({ error: "Failed to parse analysis result", raw: rawText });
    }

    // Persist to weld_analyses
    const { data: saved, error: saveError } = await supabaseService
      .from("weld_analyses")
      .insert({
        user_id: userId,
        image_urls: publicUrls,
        weld_process,
        base_material,
        code_standard,
        defects_identified: result.defects_identified || [],
        overall_assessment: result.overall_assessment,
        code_reference: result.code_reference,
        confidence: result.confidence,
        full_response_json: result,
        saved: false,
        job_reference: job_reference || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return res.json({ result, saved: false, save_error: saveError.message });
    }

    return res.json({ result, record_id: saved.id });
  } catch (err) {
    console.error("Weld analyze error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
