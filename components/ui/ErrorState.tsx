import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title: string;
  /** Human, specific, actionable message (Section 11.6). */
  message: string;
  /** Optional extra guidance line. */
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * ErrorState — the honest failure panel used across tool flows. Pairs the
 * message with an icon and a retry action so colour is never the only signal.
 */
export function ErrorState({
  title,
  message,
  hint,
  action,
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-danger/30 bg-danger-tint px-6 py-10 text-center",
        className,
      )}
    >
      <div className="text-danger">{icon ?? <AlertTriangle size={22} />}</div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        <p className="prose-measure text-sm text-ink-mid">{message}</p>
        {hint && <p className="text-2xs text-ink-low">{hint}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
