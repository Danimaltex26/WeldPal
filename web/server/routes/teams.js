// Team management routes — create teams, invite members, view dashboard.
// Auth applied per-route (not router-level) because /preview is unauthenticated.

import { Router } from "express";
import crypto from "crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendTeamInviteEmail } from "../utils/email.js";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const TEAM_PRICE_ID = process.env.STRIPE_TEAM_PRICE_ID;
const APP_URL = process.env.APP_URL || "https://weldpal.tradepals.net";

const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseApp = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "weldpal" } }
);

// ── POST /api/teams/create ────────────────────────────────────────────────────
// Create a new team + Stripe Checkout Session. Team starts as 'pending' until
// Stripe webhook confirms payment.

router.post("/create", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = req.profile;

    if (profile.role === "manager") {
      return res.status(400).json({ error: "You already manage a team" });
    }
    if (profile.team_id) {
      return res.status(400).json({ error: "You are already on a team. Leave your current team first." });
    }

    const { teamName } = req.body;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const inviteCode = crypto.randomBytes(4).toString("hex");

    // Create team with 'pending' status — will activate on Stripe payment
    const { data: team, error: teamError } = await supabasePublic
      .from("teams")
      .insert({
        manager_id: userId,
        team_name: teamName.trim(),
        invite_code: inviteCode,
        seats_used: 1,
        subscription_status: "pending",
      })
      .select()
      .single();

    if (teamError) {
      console.error("[Teams] Create error:", teamError);
      return res.status(500).json({ error: "Failed to create team" });
    }

    // Update profile: role=manager, team_id
    const { error: profileError } = await supabasePublic
      .from("profiles")
      .update({ role: "manager", team_id: team.id })
      .eq("id", userId);

    if (profileError) {
      console.error("[Teams] Profile update error:", profileError);
      await supabasePublic.from("teams").delete().eq("id", team.id);
      return res.status(500).json({ error: "Failed to update profile" });
    }

    // Add manager as team member
    await supabasePublic.from("team_members").insert({
      team_id: team.id,
      user_id: userId,
      invited_by: userId,
      status: "active",
    });

    // Create Stripe Checkout Session for the team plan
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: profile.email,
      line_items: [{ price: TEAM_PRICE_ID, quantity: 1 }],
      metadata: { team_id: team.id, manager_id: userId },
      success_url: `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/profile`,
    });

    return res.json({ checkoutUrl: session.url, team });
  } catch (err) {
    console.error("[Teams] Create error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/teams/billing-portal ─────────────────────────────────────────────
// Opens Stripe Customer Portal for the manager to update card, view invoices, cancel.

router.get("/billing-portal", auth, requireRole("manager", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: team } = await supabasePublic
      .from("teams")
      .select("stripe_customer_id")
      .eq("manager_id", userId)
      .single();

    if (!team?.stripe_customer_id) {
      return res.status(404).json({ error: "No billing account found" });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: team.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/settings`,
    });

    return res.json({ url: portalSession.url });
  } catch (err) {
    console.error("[Teams] Billing portal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/teams/invite ────────────────────────────────────────────────────
// Generate an invite. Optionally send email.

router.post("/invite", auth, requireRole("manager", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.body;

    const { data: team } = await supabasePublic
      .from("teams")
      .select("*")
      .eq("manager_id", userId)
      .single();

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    if (team.subscription_status !== "active") {
      return res.status(403).json({
        error: "Team subscription is not active",
        message: "Complete payment to start inviting crew members.",
      });
    }

    if (team.seats_used >= team.seats_purchased) {
      return res.status(403).json({
        error: "No seats available",
        message: "Your team plan supports up to 10 members.",
        seats_purchased: team.seats_purchased,
        seats_used: team.seats_used,
      });
    }

    const inviteCode = crypto.randomBytes(4).toString("hex");

    const { data: invite, error: inviteError } = await supabasePublic
      .from("team_invites")
      .insert({
        team_id: team.id,
        invite_code: inviteCode,
        email: email || null,
        status: "pending",
      })
      .select()
      .single();

    if (inviteError) {
      console.error("[Teams] Invite error:", inviteError);
      return res.status(500).json({ error: "Failed to create invite" });
    }

    const inviteLink = `https://weldpal.tradepals.net/join?code=${inviteCode}`;

    // Send invite email if address provided
    if (email) {
      sendTeamInviteEmail({
        to: email,
        inviterName: req.profile.display_name || req.profile.email,
        teamName: team.team_name,
        inviteCode,
      }).catch((err) => {
        console.error("[Teams] Invite email failed:", err);
      });
    }

    return res.json({
      inviteCode,
      inviteLink,
      expiresAt: invite.expires_at,
    });
  } catch (err) {
    console.error("[Teams] Invite error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/teams/join ──────────────────────────────────────────────────────
// Join a team via invite code.

router.post("/join", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    if (req.profile.team_id) {
      return res.status(400).json({ error: "You are already on a team" });
    }

    // Look up invite
    const { data: invite } = await supabasePublic
      .from("team_invites")
      .select("*, teams(*)")
      .eq("invite_code", code)
      .eq("status", "pending")
      .maybeSingle();

    if (!invite) {
      return res.status(404).json({ error: "Invalid or expired invite code" });
    }

    if (new Date(invite.expires_at) < new Date()) {
      await supabasePublic
        .from("team_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      return res.status(410).json({ error: "This invite has expired. Ask your manager for a new one." });
    }

    const team = invite.teams;
    if (team.seats_used >= team.seats_purchased) {
      return res.status(403).json({ error: "This team has no available seats" });
    }

    // Add member
    const { error: memberError } = await supabasePublic
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: userId,
        invited_by: team.manager_id,
        status: "active",
      });

    if (memberError) {
      console.error("[Teams] Join member insert error:", memberError);
      return res.status(500).json({ error: "Failed to join team" });
    }

    // Update profile
    await supabasePublic
      .from("profiles")
      .update({ team_id: team.id })
      .eq("id", userId);

    // Pro entitlement is granted via auth middleware checking teams.subscription_status.
    // Team members get Pro as long as the team subscription is active.

    // Increment seats_used
    await supabasePublic
      .from("teams")
      .update({ seats_used: team.seats_used + 1 })
      .eq("id", team.id);

    // Mark invite accepted
    await supabasePublic
      .from("team_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    return res.json({ success: true, teamName: team.team_name });
  } catch (err) {
    console.error("[Teams] Join error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/teams/preview ────────────────────────────────────────────────────
// Public endpoint — returns team name for the join screen (no auth required).

router.get("/preview", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const { data: invite } = await supabasePublic
      .from("team_invites")
      .select("status, expires_at, teams(team_name)")
      .eq("invite_code", code)
      .maybeSingle();

    if (!invite) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    if (invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: "This invite has expired" });
    }

    return res.json({ teamName: invite.teams.team_name });
  } catch (err) {
    console.error("[Teams] Preview error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/teams/dashboard ────────────────────────────────────��─────────────
// Team overview with member activity stats.

router.get("/dashboard", auth, requireRole("manager", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get team
    const { data: team } = await supabasePublic
      .from("teams")
      .select("*")
      .eq("manager_id", userId)
      .single();

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Get active members with profiles
    const { data: members } = await supabasePublic
      .from("team_members")
      .select("user_id, joined_at, profiles!team_members_user_id_fkey(id, email, display_name, role)")
      .eq("team_id", team.id)
      .eq("status", "active")
      .limit(50);

    const memberIds = (members || []).map((m) => m.user_id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fan out activity queries for all members
    const [weldCounts, troubleshootCounts, testSessionCounts, readinessRows] =
      await Promise.all([
        supabaseApp
          .from("weld_analyses")
          .select("user_id", { count: "exact" })
          .in("user_id", memberIds)
          .gte("created_at", sevenDaysAgo),
        supabaseApp
          .from("troubleshoot_sessions")
          .select("user_id", { count: "exact" })
          .in("user_id", memberIds)
          .gte("created_at", sevenDaysAgo),
        supabaseApp
          .from("training_test_sessions")
          .select("user_id", { count: "exact" })
          .in("user_id", memberIds)
          .gte("completed_at", sevenDaysAgo),
        supabaseApp
          .from("training_readiness")
          .select("user_id, cert_level, overall_readiness_percent, estimated_pass")
          .in("user_id", memberIds),
      ]);

    // Build per-user activity counts
    function countByUser(rows) {
      const map = {};
      for (const r of rows || []) {
        map[r.user_id] = (map[r.user_id] || 0) + 1;
      }
      return map;
    }

    const weldMap = countByUser(weldCounts.data);
    const troubleshootMap = countByUser(troubleshootCounts.data);
    const testMap = countByUser(testSessionCounts.data);

    // Build readiness map
    const readinessMap = {};
    for (const r of readinessRows.data || []) {
      if (!readinessMap[r.user_id]) readinessMap[r.user_id] = [];
      readinessMap[r.user_id].push(r);
    }

    // Assemble member data
    const enrichedMembers = (members || []).map((m) => {
      const uid = m.user_id;
      const profile = m.profiles;
      const readiness = readinessMap[uid] || [];
      const bestReadiness = readiness.reduce(
        (best, r) => (r.overall_readiness_percent > (best?.overall_readiness_percent || 0) ? r : best),
        null
      );

      const weekWeld = weldMap[uid] || 0;
      const weekTroubleshoot = troubleshootMap[uid] || 0;
      const weekTraining = testMap[uid] || 0;
      const weekTotal = weekWeld + weekTroubleshoot + weekTraining;

      return {
        user_id: uid,
        display_name: profile?.display_name || null,
        email: profile?.email || null,
        role: profile?.role || "tech",
        joined_at: m.joined_at,
        activity_this_week: {
          weld: weekWeld,
          troubleshoot: weekTroubleshoot,
          training: weekTraining,
          total: weekTotal,
        },
        best_readiness: bestReadiness
          ? {
              cert_level: bestReadiness.cert_level,
              percent: bestReadiness.overall_readiness_percent,
              estimated_pass: bestReadiness.estimated_pass,
            }
          : null,
        readiness_levels: readiness.map((r) => ({
          cert_level: r.cert_level,
          percent: r.overall_readiness_percent,
          estimated_pass: r.estimated_pass,
        })),
      };
    });

    // Team-level stats
    const totalMembers = enrichedMembers.length;
    const activeThisWeek = enrichedMembers.filter((m) => m.activity_this_week.total > 0).length;
    const examReady = enrichedMembers.filter((m) => m.best_readiness?.percent >= 75).length;
    const allReadiness = enrichedMembers
      .filter((m) => m.best_readiness)
      .map((m) => m.best_readiness.percent);
    const avgReadiness =
      allReadiness.length > 0
        ? Math.round(allReadiness.reduce((a, b) => a + b, 0) / allReadiness.length)
        : 0;
    const inactive7d = enrichedMembers.filter((m) => m.activity_this_week.total === 0).length;

    return res.json({
      team,
      members: enrichedMembers,
      teamStats: {
        total_members: totalMembers,
        active_this_week: activeThisWeek,
        exam_ready: examReady,
        avg_readiness: avgReadiness,
        inactive_7d: inactive7d,
      },
    });
  } catch (err) {
    console.error("[Teams] Dashboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/teams/member/:userId ─────────────────────────────────────────────
// Detailed member view.

router.get("/member/:userId", auth, requireRole("manager", "admin"), async (req, res) => {
  try {
    const managerId = req.user.id;
    const targetUserId = req.params.userId;

    // Verify manager owns the team and target is a member
    const { data: team } = await supabasePublic
      .from("teams")
      .select("id")
      .eq("manager_id", managerId)
      .single();

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const { data: membership } = await supabasePublic
      .from("team_members")
      .select("*")
      .eq("team_id", team.id)
      .eq("user_id", targetUserId)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return res.status(404).json({ error: "Member not found on your team" });
    }

    // Fetch profile
    const { data: profile } = await supabasePublic
      .from("profiles")
      .select("id, email, display_name, role, created_at")
      .eq("id", targetUserId)
      .single();

    // Fetch activity
    const [recentWeld, recentTroubleshoot, readiness, trainingProgress] =
      await Promise.all([
        supabaseApp
          .from("weld_analyses")
          .select("id, created_at, diagnosis, confidence, full_response_json")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseApp
          .from("troubleshoot_sessions")
          .select("id, created_at, weld_process, base_material, resolved")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseApp
          .from("training_readiness")
          .select("*")
          .eq("user_id", targetUserId),
        supabaseApp
          .from("training_progress")
          .select("*, training_modules(title, cert_level)")
          .eq("user_id", targetUserId)
          .order("last_session_at", { ascending: false }),
      ]);

    return res.json({
      profile,
      joined_at: membership.joined_at,
      recent_weld: recentWeld.data || [],
      recent_troubleshoot: recentTroubleshoot.data || [],
      readiness: readiness.data || [],
      training_progress: trainingProgress.data || [],
    });
  } catch (err) {
    console.error("[Teams] Member detail error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/teams/member/:userId ──────────────────────────────────────────
// Remove a member from the team.

router.delete("/member/:userId", auth, requireRole("manager", "admin"), async (req, res) => {
  try {
    const managerId = req.user.id;
    const targetUserId = req.params.userId;

    if (targetUserId === managerId) {
      return res.status(400).json({ error: "Cannot remove yourself from the team" });
    }

    const { data: team } = await supabasePublic
      .from("teams")
      .select("*")
      .eq("manager_id", managerId)
      .single();

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Mark member as removed
    const { error: memberError } = await supabasePublic
      .from("team_members")
      .update({ status: "removed", removed_at: new Date().toISOString() })
      .eq("team_id", team.id)
      .eq("user_id", targetUserId)
      .eq("status", "active");

    if (memberError) {
      console.error("[Teams] Remove member error:", memberError);
      return res.status(500).json({ error: "Failed to remove member" });
    }

    // Clear team_id on profile
    await supabasePublic
      .from("profiles")
      .update({ team_id: null })
      .eq("id", targetUserId);

    // Decrement seats
    await supabasePublic
      .from("teams")
      .update({ seats_used: Math.max(0, team.seats_used - 1) })
      .eq("id", team.id);

    return res.json({ success: true });
  } catch (err) {
    console.error("[Teams] Remove member error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/teams/settings ───────────────────────────────────────────────────

router.get("/settings", auth, requireRole("manager", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: team } = await supabasePublic
      .from("teams")
      .select("*")
      .eq("manager_id", userId)
      .single();

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const { data: members } = await supabasePublic
      .from("team_members")
      .select("user_id, status, joined_at, removed_at, profiles!team_members_user_id_fkey(display_name, email)")
      .eq("team_id", team.id)
      .order("joined_at", { ascending: true });

    const { data: invites } = await supabasePublic
      .from("team_invites")
      .select("*")
      .eq("team_id", team.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return res.json({ team, members: members || [], invites: invites || [] });
  } catch (err) {
    console.error("[Teams] Settings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/teams/settings ─────────────────────────────────────────────────

router.patch("/settings", auth, requireRole("manager", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamName } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const { data: team, error } = await supabasePublic
      .from("teams")
      .update({ team_name: teamName.trim() })
      .eq("manager_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[Teams] Settings update error:", error);
      return res.status(500).json({ error: "Failed to update team" });
    }

    return res.json({ team });
  } catch (err) {
    console.error("[Teams] Settings update error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
