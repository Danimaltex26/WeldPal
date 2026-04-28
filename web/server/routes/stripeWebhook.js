// Stripe webhook handler for team billing lifecycle.
// Mounted BEFORE express.json() — needs raw body for signature verification.

import { Router } from "express";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/webhooks/stripe
// Body must be raw (Buffer) for signature verification.
// express.raw({ type: 'application/json' }) is applied at the app.js mount point.
router.post("/", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!stripe) {
    console.error("[Stripe] STRIPE_SECRET_KEY not configured");
    return res.status(500).send("Stripe not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[Stripe] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // ── Checkout completed — team goes active ─────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const teamId = session.metadata?.team_id;
        if (!teamId) {
          console.warn("[Stripe] checkout.session.completed missing team_id metadata");
          break;
        }

        const { error } = await supabase
          .from("teams")
          .update({
            subscription_status: "active",
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
          .eq("id", teamId);

        if (error) {
          console.error("[Stripe] Failed to activate team:", error);
        } else {
          console.log("[Stripe] Team activated:", teamId);
        }
        break;
      }

      // ── Invoice paid — keep active (covers renewals) ──────────────────
      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        await supabase
          .from("teams")
          .update({ subscription_status: "active" })
          .eq("stripe_subscription_id", subId);

        console.log("[Stripe] Invoice paid, team active:", subId);
        break;
      }

      // ── Payment failed — grace period ─────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        await supabase
          .from("teams")
          .update({ subscription_status: "past_due" })
          .eq("stripe_subscription_id", subId);

        console.log("[Stripe] Payment failed, team past_due:", subId);
        break;
      }

      // ── Subscription cancelled — revoke access ────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subId = subscription.id;

        await supabase
          .from("teams")
          .update({ subscription_status: "cancelled" })
          .eq("stripe_subscription_id", subId);

        console.log("[Stripe] Subscription cancelled, team deactivated:", subId);
        break;
      }

      default:
        // Unhandled event type — ignore silently
        break;
    }
  } catch (err) {
    console.error("[Stripe] Webhook handler error:", err);
    // Still return 200 to avoid Stripe retries on app errors
  }

  return res.json({ received: true });
});

export default router;
