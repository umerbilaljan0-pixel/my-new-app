import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export interface PriceCardProps {
  name: string;
  price: string;
  cadence: string;
  features: readonly string[];
  cta: string;
  featured?: boolean;
  badge?: string;
}

/**
 * PriceCard — one plan column (Section 11.3). The featured plan gets an amber
 * border and a badge; prices render in the mono face.
 */
export function PriceCard({
  name,
  price,
  cadence,
  features,
  cta,
  featured,
  badge,
}: PriceCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-lg border bg-surface p-6",
        featured ? "border-amber shadow-hairline" : "border-line",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">{name}</h3>
          {badge && <Badge tone="amber">{badge}</Badge>}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="tabular text-xl font-semibold text-ink">{price}</span>
          <span className="text-2xs text-ink-low">{cadence}</span>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink-mid">
            <Check size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-semibold transition-colors duration-ui ease-brand active:scale-[0.98]",
          featured
            ? "bg-amber text-white hover:bg-amber-press"
            : "border border-line bg-surface text-ink hover:border-line-strong hover:bg-sunken",
        )}
      >
        {cta}
      </button>
    </div>
  );
}
