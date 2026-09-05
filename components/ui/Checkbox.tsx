import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: string;
}

/**
 * Checkbox — 6px radius (Section 3.4). A real, focusable <input type="checkbox">
 * is visually hidden; the box and tick are direct siblings of it so Tailwind's
 * peer-* state utilities (general-sibling combinator) apply correctly.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, disabled, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId}
          className={cn(
            "inline-flex cursor-pointer items-start gap-2.5 text-sm text-ink",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <span className="relative mt-0.5 inline-flex h-[18px] w-[18px] shrink-0">
            <input
              ref={ref}
              id={fieldId}
              type="checkbox"
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              {...props}
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-sm border bg-surface transition-colors duration-ui ease-brand",
                "peer-hover:border-amber",
                "peer-checked:border-amber peer-checked:bg-amber",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-amber peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper",
                error ? "border-danger" : "border-line-strong",
              )}
            />
            <Check
              aria-hidden
              size={12}
              strokeWidth={3}
              className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 transition-opacity duration-ui ease-brand peer-checked:opacity-100"
            />
          </span>
          {label && <span className="leading-snug">{label}</span>}
        </label>
        {error && (
          <p id={errorId} role="alert" className="text-2xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
