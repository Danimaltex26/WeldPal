// GET    /api/profile — current user profile
// PATCH  /api/profile — update profile fields (processes, certs, industry, experience)
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get("/", auth, async (req, res) => {
  return res.json({ profile: req.profile });
});

router.patch("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, welding_processes, certifications, primary_industry, experience_level } = req.body;
    const update = {};
    if (display_name !== undefined) update.display_name = display_name;
    if (welding_processes !== undefined) update.welding_processes = welding_processes;
    if (certifications !== undefined) update.certifications = certifications;
    if (primary_industry !== undefined) update.primary_industry = primary_industry;
    if (experience_level !== undefined) update.experience_level = experience_level;

    const { data, error } = await supabaseService
      .from("profiles")
      .update(update)
      .eq("id", userId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ profile: data });
  } catch (err) {
    console.error("Profile patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
