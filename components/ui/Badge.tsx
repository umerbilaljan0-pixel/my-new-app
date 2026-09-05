import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "amber" | "cyan" | "ok" | "danger" | "warn";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-ink-mid border-line",
  amber: "bg-amber-tint text-amber-press border-amber/30",
  cyan: "bg-cyan-tint text-cyan border-cyan/30",
  ok: "bg-ok-tint text-ok border-ok/30",
  danger: "bg-danger-tint text-danger border-danger/30",
  warn: "bg-warn-tint text-warn border-warn/30",
};

/**
 * Badge — small status/label chip. Rounded rectangle (radius sm) to distinguish
 * from the fully-round Pill.
 */
export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-2xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
