import "server-only";
import { accountStore } from "@/lib/db/accounts";
import type { Job } from "@/lib/db/types";

/**
 * Credit rules (Sections 6 / 12). All changes go through the ledger; the balance
 * is never mutated directly. Credits are charged at download time, not at job
 * creation, so a failed or never-downloaded job costs nothing.
 */

/** The primary on-ramp: 20 HD credits for $2, one time (Section 11.3). */
export const STARTER_PACK = { credits: 20, amountCents: 200, label: "20 credits for $2" };

/** HD cost for a job: 8K upscale is 3, 4K is 2, everything else 1 (Section 11.3). */
export function hdCostForJob(job: Job): number {
  if (job.tool === "uplift" && job.params.tool === "uplift") {
    if (job.params.target === "8k") return 3;
    if (job.params.target === "4k") return 2;
  }
  return 1;
}

export async function getBalance(userId: string): Promise<number> {
  return (await accountStore()).getBalance(userId);
}

export async function grantCredits(
  userId: string,
  amount: number,
  reason: "purchase" | "subscription_grant" | "promo",
  ref?: { stripePaymentIntent?: string },
): Promise<number> {
  const store = await accountStore();
  const { balance } = await store.appendLedger({
    userId,
    delta: amount,
    reason,
    stripePaymentIntent: ref?.stripePaymentIntent ?? null,
  });
  return balance;
}

/** Charge credits for an HD download. Throws Error("INSUFFICIENT_CREDITS"). */
export async function chargeCredits(userId: string, amount: number, jobId: string): Promise<number> {
  const store = await accountStore();
  const { balance } = await store.appendLedger({ userId, delta: -amount, reason: "job_charge", jobId });
  return balance;
}

export async function refundCredits(userId: string, amount: number, jobId: string): Promise<number> {
  const store = await accountStore();
  const { balance } = await store.appendLedger({ userId, delta: amount, reason: "refund", jobId });
  return balance;
}
