import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  /** Error message; presence switches the field to its error state. */
  error?: string;
  leadingIcon?: ReactNode;
  /** Trailing adornment (icon button, unit, etc.). */
  trailing?: ReactNode;
}

/**
 * Input — text field with label, hint, and error states (Section 3.6).
 * Error state is conveyed by both colour AND an inline message + role="alert"
 * so colour is never the sole carrier of meaning (Section 3.8).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, hint, error, leadingIcon, trailing, className, id, disabled, ...props },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="label-eyebrow">
            {label}
          </label>
        )}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border bg-sunken px-3 transition-colors duration-ui ease-brand",
            "focus-within:ring-2 focus-within:ring-amber focus-within:ring-offset-2 focus-within:ring-offset-paper",
            error
              ? "border-danger"
              : "border-line hover:border-line-strong focus-within:border-amber",
            disabled && "opacity-50",
          )}
        >
          {leadingIcon && (
            <span className="shrink-0 text-ink-low">{leadingIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              "h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-low",
              className,
            )}
            {...props}
          />
          {trailing && <span className="shrink-0">{trailing}</span>}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-2xs text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-2xs text-ink-low">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
