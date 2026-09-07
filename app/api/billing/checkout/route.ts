import { type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/auth/session";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { STARTER_PACK, grantCredits } from "@/lib/credits";
import { accountStore } from "@/lib/db/accounts";

export const runtime = "nodejs";

const schema = z.object({
  /** Same-origin path to return to (e.g. "/remove-background?restore=<id>"). */
  returnTo: z.string().startsWith("/").optional(),
});

/**
 * POST /api/billing/checkout — buy the $2 / 20-credit Starter pack (Section 12).
 * With Stripe configured it opens Checkout; without it (dev) it grants the
 * credits immediately so the flow is demonstrable. Returns a URL to send the
 * browser to.
 */
export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return errorResponse("UNAUTHORIZED", { message: "Sign in to buy credits." });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const returnPath = parsed.success ? parsed.data.returnTo : undefined;
  // Resolve return URLs against the actual request origin so they work on any
  // host/port (localhost, preview, production).
  const base = req.nextUrl.origin;
  const successUrl = new URL(returnPath ?? "/app/billing", base);
  successUrl.searchParams.set("purchase", "success");
  const cancelUrl = new URL(returnPath ?? "/pricing", base).toString();

  const stripe = getStripe();
  if (stripe && isStripeConfigured()) {
    const store = await accountStore();
    const user = await store.getUserById(session.userId);
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user?.email ?? session.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: STARTER_PACK.amountCents,
            product_data: { name: `CLEANPLATE — ${STARTER_PACK.credits} HD credits` },
          },
        },
      ],
      metadata: { userId: session.userId, credits: String(STARTER_PACK.credits) },
      success_url: `${successUrl.toString()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });
    return jsonResponse({ url: checkout.url, mode: "stripe" });
  }

  // Dev fallback: grant credits immediately (no real payment).
  await grantCredits(session.userId, STARTER_PACK.credits, "purchase");
  successUrl.searchParams.set("purchase", "dev");
  return jsonResponse({ url: successUrl.toString(), mode: "dev" });
}
