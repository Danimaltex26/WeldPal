import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || "";
const APP_KEY = "weldpal";

const PRO_EVENTS = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
];

const FREE_EVENTS = [
  "EXPIRATION",
];

const KEEP_UNTIL_EXPIRY_EVENTS = [
  "CANCELLATION",
];

router.post("/revenuecat", async (req, res) => {
  try {
    if (WEBHOOK_SECRET) {
      const authHeader = req.headers.authorization || "";
      const isValid =
        authHeader === `Bearer ${WEBHOOK_SECRET}` ||
        authHeader === WEBHOOK_SECRET;
      if (!isValid) {
        console.warn("[RevenueCat Webhook] Invalid or missing authorization");
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const { event } = req.body;
    if (!event) {
      return res.status(400).json({ error: "Missing event payload" });
    }

    const eventType = event.type;
    const appUserId = event.app_user_id;
    const expirationAtMs = event.expiration_at_ms;

    if (!appUserId) {
      console.warn("[RevenueCat Webhook] Missing app_user_id in event:", eventType);
      return res.status(400).json({ error: "Missing app_user_id" });
    }

    if (appUserId.startsWith("$RCAnonymousID:")) {
      console.log("[RevenueCat Webhook] Skipping anonymous user:", eventType);
      return res.json({ ok: true, skipped: true });
    }

    console.log(`[RevenueCat Webhook] ${eventType} for user ${appUserId}`);

    const expiresAt = expirationAtMs
      ? new Date(expirationAtMs).toISOString()
      : null;

    if (PRO_EVENTS.includes(eventType)) {
      await upsertSubscription(appUserId, "pro", expiresAt);
    } else if (FREE_EVENTS.includes(eventType)) {
      await upsertSubscription(appUserId, "free", null);
    } else if (KEEP_UNTIL_EXPIRY_EVENTS.includes(eventType)) {
      await upsertSubscription(appUserId, "pro", expiresAt);
    } else {
      console.log(`[RevenueCat Webhook] Unhandled event type: ${eventType}`);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[RevenueCat Webhook] Error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

async function upsertSubscription(userId, tier, expiresAt) {
  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        app: APP_KEY,
        tier,
        source: "stripe",
        expires_at: expiresAt,
      },
      { onConflict: "user_id,app" }
    );

  if (error) {
    console.error("[RevenueCat Webhook] Supabase upsert error:", error.message);
    throw error;
  }

  console.log(`[RevenueCat Webhook] ${APP_KEY} subscription set to ${tier} for ${userId}`);
}

export default router;
