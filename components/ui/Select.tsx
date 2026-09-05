import {
  forwardRef,
  useId,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

/**
 * Select — native <select> styled to the system. Native is deliberate: it is
 * fully keyboard/screen-reader accessible and renders the OS picker on mobile.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, options, placeholder, className, id, disabled, ...props },
    ref,
  ) => {
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
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              "h-10 w-full appearance-none rounded-md border bg-sunken pl-3 pr-9 text-sm text-ink outline-none transition-colors duration-ui ease-brand",
              "focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-paper",
              error
                ? "border-danger"
                : "border-line hover:border-line-strong focus:border-amber",
              disabled && "opacity-50",
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-low"
          />
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

Select.displayName = "Select";
