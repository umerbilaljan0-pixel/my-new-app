import { EmptyState } from "@/components/ui/EmptyState";
import type { LedgerEntry } from "@/lib/db/accounts/types";

const REASON_LABEL: Record<string, string> = {
  purchase: "Credit purchase",
  subscription_grant: "Plan credits",
  job_charge: "HD download",
  refund: "Refund",
  promo: "Promo credits",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * LedgerList — the credit history / invoices (Section 4). Every credit change is
 * a row from the ledger, the source of truth.
 */
export function LedgerList({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No transactions yet" description="Credit purchases and usage appear here." />;
  }
  return (
    <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-4 p-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-ink">{REASON_LABEL[e.reason] ?? e.reason}</span>
            <span className="tabular text-2xs text-ink-low">{fmtDate(e.createdAt)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`tabular text-sm font-semibold ${e.delta >= 0 ? "text-ok" : "text-ink"}`}>
              {e.delta >= 0 ? "+" : ""}
              {e.delta}
            </span>
            <span className="tabular w-16 text-right text-2xs text-ink-low">bal {e.balanceAfter}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
