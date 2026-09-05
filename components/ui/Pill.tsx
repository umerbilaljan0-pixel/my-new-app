import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PillProps {
  children: ReactNode;
  /** Optional leading icon/glyph. */
  icon?: ReactNode;
  tone?: "neutral" | "amber";
  className?: string;
}

/**
 * Pill — fully-rounded chip (radius 999px). Used for the header credit balance
 * and other compact status readouts.
 */
export function Pill({ children, icon, tone = "neutral", className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-2xs font-semibold",
        tone === "amber"
          ? "border-amber/30 bg-amber-tint text-amber-press"
          : "border-line bg-surface text-ink-mid",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
