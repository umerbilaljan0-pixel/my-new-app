import { cn } from "@/lib/utils";

export interface SpinnerProps {
  /** Diameter in px. */
  size?: number;
  className?: string;
  /** Accessible label; omit to hide from a11y tree when decorative. */
  label?: string;
}

/**
 * Spinner — indeterminate loader. Uses currentColor so it inherits the caller's
 * text colour (e.g. white inside a primary button, --ink-mid elsewhere).
 */
export function Spinner({ size = 16, className, label }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block animate-spin", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
