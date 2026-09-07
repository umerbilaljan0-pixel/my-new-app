import "server-only";
import Stripe from "stripe";

/**
 * Stripe client (production billing). When STRIPE_SECRET_KEY is unset the app
 * falls back to a dev "grant" path so the credits flow is demonstrable without
 * Stripe keys — see app/api/billing/checkout.
 */

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" });
  }
  return client;
}
