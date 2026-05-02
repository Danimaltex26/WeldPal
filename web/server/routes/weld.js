// POST /api/weld/analyze — upload weld photo(s), get AI defect analysis.
import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { sendAnalysisReadyEmail } from "../utils/email.js";
import { analyzeWeldPhoto } from "../utils/weldAnalyzer.js";
import { screenImage } from "../utils/contentGuard.js";

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

    // Content guard: screen first image for appropriateness and domain relevance
    const guard = await screenImage(req.files[0].buffer, req.files[0].mimetype, "weldpal");
    if (!guard.allowed) {
      return res.status(400).json({ error: guard.reason });
    }

    // Upload images to Supabase Storage
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
    }

    // CLAUDE API CALL: weld photo analysis — see /server/utils/weldAnalyzer.js
    let analysisResult;
    try {
      analysisResult = await analyzeWeldPhoto({
        imageBase64: req.files[0].buffer.toString("base64"),
        imageMediaType: req.files[0].mimetype || "image/jpeg",
        weldProcess: weld_process,
        baseMaterial: base_material,
        codeStandard: code_standard,
        userNotes: req.body.user_notes,
        userId,
      });
    } catch (error) {
      if (error.type === 'api_error' || error.type === 'parse_error' || error.type === 'validation_error') {
        return res.status(error.status || 500).json({
          error: error.userMessage || 'Analysis failed. Please try again.'
        });
      }
      throw error; // Re-throw unexpected errors to global error handler
    }

    const { analysis: result, usage } = analysisResult;

    // Persist to weld_analyses
    const { data: saved, error: saveError } = await supabaseService
      .from("weld_analyses")
      .insert({
        user_id: userId,
        image_urls: publicUrls,
        weld_process,
        base_material,
        code_standard,
        defects_identified: result.defects || [],
        overall_assessment: result.overall_assessment,
        code_reference: result.code_references || [],
        confidence: result.confidence,
        full_response_json: result,
        saved: false,
        job_reference: job_reference || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return res.json({ result, saved: false, save_error: saveError.message, model: analysisResult.model });
    }

    // Only send email for offline-queued analyses
    if (req.body.queued) {
      sendAnalysisReadyEmail({
        to: req.user.email,
        appKey: "weldpal",
        displayName: req.profile?.display_name || req.user.email,
        analysisType: weld_process || "weld",
      }).catch((err) => console.error("Email notification error:", err));
    }

    return res.json({ result, record_id: saved.id, model: analysisResult.model });
  } catch (err) {
    console.error("Weld analyze error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
