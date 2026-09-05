import { cn } from "@/lib/utils";

export interface ProgressProps {
  /** 0–100. Omit for the indeterminate variant. */
  value?: number;
  className?: string;
  /** Accessible name for the progress bar. */
  label?: string;
}

/**
 * Progress — determinate (value given) or indeterminate (value omitted). The
 * fill is amber (Section 3.1). Used for upload byte progress and job progress.
 */
export function Progress({ value, className, label }: ProgressProps) {
  const determinate = typeof value === "number";
  const clamped = determinate ? Math.max(0, Math.min(100, value!)) : undefined;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={determinate ? clamped : undefined}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-pill bg-sunken",
        className,
      )}
    >
      {determinate ? (
        <div
          className="h-full rounded-pill bg-amber transition-[width] duration-ui ease-brand"
          style={{ width: `${clamped}%` }}
        />
      ) : (
        <div className="h-full w-1/3 animate-shimmer rounded-pill bg-amber" />
      )}
    </div>
  );
}
