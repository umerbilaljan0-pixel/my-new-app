import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { accountStore } from "@/lib/db/accounts";
import { grantCredits } from "@/lib/credits";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe — grant credits on completed checkout (Section 12).
 * Verifies the signature and is idempotent by event id. Credits are granted
 * inside the ledger.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe] signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const store = await accountStore();
  const isNew = await store.markStripeEvent(event.id);
  if (!isNew) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as { metadata?: Record<string, string>; payment_intent?: string };
      const userId = s.metadata?.userId;
      const credits = Number(s.metadata?.credits ?? 0);
      if (userId && credits > 0) {
        await grantCredits(userId, credits, "purchase", {
          stripePaymentIntent: typeof s.payment_intent === "string" ? s.payment_intent : undefined,
        });
      }
    }
    // invoice.paid / customer.subscription.* (Pro/Studio) are handled here in a
    // later iteration; the one-time pack is the primary on-ramp.
  } catch (err) {
    console.error("[stripe] handling failed", err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
