"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Toggle — switch control built on a real checkbox for accessibility. Uses
 * role via the native input; the visual track/knob follows :checked.
 */
export function Toggle({
  checked,
  onCheckedChange,
  label,
  hideLabel,
  disabled,
  id,
  className,
}: ToggleProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        "inline-flex cursor-pointer items-center gap-3 text-sm text-ink",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input
          id={fieldId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-pill bg-line-strong transition-colors duration-ui ease-brand",
            "peer-checked:bg-amber",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-amber peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-pill bg-white shadow-hairline transition-transform duration-ui ease-brand",
            "peer-checked:translate-x-5",
          )}
        />
      </span>
      {label && (
        <span className={cn(hideLabel && "sr-only")}>{label}</span>
      )}
    </label>
  );
}
