import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState — neutral "nothing here yet" panel (e.g. empty history/batch).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-sunken px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="text-ink-low">{icon}</div>}
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {description && (
          <p className="prose-measure text-sm text-ink-mid">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
