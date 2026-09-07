import { CheckCircle2 } from "lucide-react";
import { getSessionUserFromCookies } from "@/lib/auth/session";
import { accountStore } from "@/lib/db/accounts";
import { isStripeConfigured } from "@/lib/stripe";
import { BuyCredits } from "@/components/app/BuyCredits";
import { LedgerList } from "@/components/app/LedgerList";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const session = await getSessionUserFromCookies();
  if (!session) return null;

  const sp = await searchParams;
  const store = await accountStore();
  const [user, ledger] = await Promise.all([
    store.getUserById(session.userId),
    store.listLedger(session.userId, 50),
  ]);
  const credits = user?.credits ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {sp.purchase && (
        <div className="flex items-center gap-2 rounded-lg border border-ok/30 bg-ok-tint px-4 py-3 text-sm text-ink">
          <CheckCircle2 size={18} className="text-ok" />
          Credits added{sp.purchase === "dev" ? " (dev mode — no charge)" : ""}. You&apos;re all set.
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="label-eyebrow">Balance</span>
          <span className="tabular text-2xl font-semibold text-ink">{credits} credits</span>
          <span className="text-2xs text-ink-low">
            1 credit = 1 image up to 2K. A 4K upscale costs 2.
            {!isStripeConfigured() && " Stripe isn't configured — purchases grant instantly in dev."}
          </span>
        </div>
        <BuyCredits returnTo="/app/billing" />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Transactions</h2>
        <LedgerList entries={ledger} />
      </div>
    </div>
  );
}
