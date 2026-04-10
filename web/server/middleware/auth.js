// Auth middleware: verify Supabase JWT, attach user + profile, enforce per-tier gates downstream.
import { createClient } from "@supabase/supabase-js";

// Anon client only for verifying the user's JWT
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Service-role client to read profiles (bypasses RLS — safe because we validate the JWT first)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }

    const token = header.replace("Bearer ", "");

    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      req.profile = { id: user.id, subscription_tier: "free" };
    } else {
      req.profile = profile;
    }

    // STUB: hardcoded pro for dev — remove when billing is wired up
    req.profile.subscription_tier = "pro";

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}
