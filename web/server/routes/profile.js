// GET    /api/profile — current user profile (merges public.profiles + weldpal.user_preferences)
// PATCH  /api/profile — update display_name (public.profiles) or prefs (weldpal.user_preferences)
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

// weldpal-schema client (user_preferences)
const supabaseApp = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

// public-schema client (profiles)
const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = req.profile;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [prefsRes, weldCount, troubleshootCount, referenceCount] = await Promise.all([
      supabaseApp
        .from("user_preferences")
        .select("welding_processes, certifications, primary_industry, experience_level")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseApp
        .from("weld_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth),
      supabaseApp
        .from("troubleshoot_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth),
      supabaseApp
        .from("reference_queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth),
    ]);

    // Fetch team info if user is on a team
    let team_name = null;
    let team_subscription_status = null;
    if (profile.team_id) {
      const { data: team } = await supabasePublic
        .from("teams")
        .select("team_name, subscription_status")
        .eq("id", profile.team_id)
        .maybeSingle();
      team_name = team?.team_name || null;
      team_subscription_status = team?.subscription_status || null;
    }

    return res.json({
      profile: {
        ...profile,
        team_name,
        team_subscription_status,
        welding_processes: prefsRes.data?.welding_processes || [],
        certifications: prefsRes.data?.certifications || [],
        primary_industry: prefsRes.data?.primary_industry || null,
        experience_level: prefsRes.data?.experience_level || null,
        usage: {
          weld_count: weldCount.count || 0,
          troubleshoot_count: troubleshootCount.count || 0,
          reference_count: referenceCount.count || 0,
        },
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, welding_processes, certifications, primary_industry, experience_level } = req.body;

    // display_name → public.profiles
    if (display_name !== undefined) {
      const { error } = await supabasePublic
        .from("profiles")
        .update({ display_name })
        .eq("id", userId);
      if (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Prefs → weldpal.user_preferences
    if (
      welding_processes !== undefined ||
      certifications !== undefined ||
      primary_industry !== undefined ||
      experience_level !== undefined
    ) {
      const prefUpdates = { user_id: userId };
      if (welding_processes !== undefined) prefUpdates.welding_processes = welding_processes;
      if (certifications !== undefined) prefUpdates.certifications = certifications;
      if (primary_industry !== undefined) prefUpdates.primary_industry = primary_industry;
      if (experience_level !== undefined) prefUpdates.experience_level = experience_level;

      const { error } = await supabaseApp
        .from("user_preferences")
        .upsert(prefUpdates, { onConflict: "user_id" });
      if (error) {
        console.error("Preferences upsert error:", error);
        return res.status(500).json({ error: error.message });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Profile patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
