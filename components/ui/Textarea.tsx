import {
  forwardRef,
  useId,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, disabled, rows = 4, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="label-eyebrow">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "w-full resize-y rounded-md border bg-sunken px-3 py-2 text-sm text-ink outline-none transition-colors duration-ui ease-brand",
            "placeholder:text-ink-low focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-paper",
            error
              ? "border-danger"
              : "border-line hover:border-line-strong focus:border-amber",
            disabled && "opacity-50",
            className,
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";
