import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

const CERT_LEVELS = [
  { key: "CW",   name: "CW",   fullTitle: "Certified Welder",                     questionCount: 50,  timeMinutes: 75,  passPercent: 70 },
  { key: "CAWI", name: "CAWI", fullTitle: "Certified Associate Welding Inspector", questionCount: 75,  timeMinutes: 120, passPercent: 72 },
  { key: "CWI",  name: "CWI",  fullTitle: "Certified Welding Inspector",           questionCount: 100, timeMinutes: 150, passPercent: 72 },
  { key: "CWS",  name: "CWS",  fullTitle: "Certified Welding Supervisor",          questionCount: 75,  timeMinutes: 120, passPercent: 72 },
  { key: "CRAW", name: "CRAW", fullTitle: "Certified Robotic Arc Welding",         questionCount: 75,  timeMinutes: 120, passPercent: 72 },
];

// GET /path — Returns the certification ladder with user progress
router.get("/path", async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all modules (for counts and estimated hours)
    const { data: modules, error: modErr } = await supabase
      .from("training_modules")
      .select("cert_level, estimated_minutes")
      .eq("is_published", true);

    if (modErr) throw modErr;

    // Fetch user readiness for all cert levels
    const { data: readinessRows, error: readErr } = await supabase
      .from("training_readiness")
      .select("cert_level, overall_readiness_percent")
      .eq("user_id", userId);

    if (readErr) throw readErr;

    // Build lookup maps
    const moduleCounts = {};
    const estimatedHours = {};
    for (const m of modules || []) {
      moduleCounts[m.cert_level] = (moduleCounts[m.cert_level] || 0) + 1;
      estimatedHours[m.cert_level] = (estimatedHours[m.cert_level] || 0) + m.estimated_minutes;
    }

    const readinessMap = {};
    for (const r of readinessRows || []) {
      readinessMap[r.cert_level] = Number(r.overall_readiness_percent) || 0;
    }

    // Determine locked status — linear ladder: CW → CAWI → CWI → CWS → CRAW
    const cwReady = readinessMap["CW"] || 0;
    const cawiReady = readinessMap["CAWI"] || 0;
    const cwiReady = readinessMap["CWI"] || 0;
    const cwsReady = readinessMap["CWS"] || 0;

    function isUnlocked(key) {
      if (key === "CW") return true;
      if (key === "CAWI") return cwReady >= 80;
      if (key === "CWI") return cawiReady >= 80;
      if (key === "CWS") return cwiReady >= 80;
      if (key === "CRAW") return cwsReady >= 80;
      return false;
    }

    const path = CERT_LEVELS.map((level) => ({
      key: level.key,
      name: level.name,
      fullTitle: level.fullTitle,
      questionCount: level.questionCount,
      timeMinutes: level.timeMinutes,
      passPercent: level.passPercent,
      moduleCount: moduleCounts[level.key] || 0,
      estimatedHours: Math.round(((estimatedHours[level.key] || 0) / 60) * 10) / 10,
      readiness: readinessMap[level.key] || 0,
      locked: !isUnlocked(level.key),
    }));

    res.json({ path });
  } catch (err) {
    console.error("GET /path error:", err);
    res.status(500).json({ error: "Failed to load certification path" });
  }
});

export default router;
