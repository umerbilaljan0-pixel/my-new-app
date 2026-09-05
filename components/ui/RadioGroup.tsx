"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  label?: string;
  /** Layout: stacked cards (default) or an inline segmented row. */
  variant?: "cards" | "inline";
  className?: string;
}

/**
 * RadioGroup — accessible single-select. `variant="cards"` renders selectable
 * rows (used by the Quality / Resolution pickers); `variant="inline"` renders a
 * compact segmented control.
 */
export function RadioGroup({
  name,
  value,
  onValueChange,
  options,
  label,
  variant = "cards",
  className,
}: RadioGroupProps) {
  const autoName = useId();
  const groupName = name ?? autoName;
  const labelId = `${groupName}-label`;

  return (
    <div
      role="radiogroup"
      aria-labelledby={label ? labelId : undefined}
      className={cn("flex w-full flex-col gap-2", className)}
    >
      {label && (
        <span id={labelId} className="label-eyebrow">
          {label}
        </span>
      )}
      <div
        className={cn(
          variant === "cards"
            ? "flex flex-col gap-2"
            : "inline-flex rounded-md border border-line bg-sunken p-1",
        )}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          const optId = `${groupName}-${opt.value}`;
          if (variant === "inline") {
            return (
              <label
                key={opt.value}
                htmlFor={optId}
                className={cn(
                  "relative cursor-pointer rounded-[7px] px-4 py-1.5 text-xs font-semibold transition-colors duration-ui ease-brand",
                  selected ? "bg-surface text-ink shadow-hairline" : "text-ink-mid hover:text-ink",
                  opt.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  id={optId}
                  type="radio"
                  name={groupName}
                  value={opt.value}
                  checked={selected}
                  disabled={opt.disabled}
                  onChange={() => onValueChange(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            );
          }
          return (
            <label
              key={opt.value}
              htmlFor={optId}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors duration-ui ease-brand",
                selected
                  ? "border-amber bg-amber-tint"
                  : "border-line bg-surface hover:border-line-strong",
                opt.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="relative mt-0.5 inline-flex h-[18px] w-[18px] shrink-0">
                <input
                  id={optId}
                  type="radio"
                  name={groupName}
                  value={opt.value}
                  checked={selected}
                  disabled={opt.disabled}
                  onChange={() => onValueChange(opt.value)}
                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-pill border bg-surface transition-colors duration-ui ease-brand",
                    "peer-checked:border-amber",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-amber peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper",
                    "border-line-strong",
                  )}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 m-auto h-2 w-2 scale-0 rounded-pill bg-amber transition-transform duration-ui ease-brand peer-checked:scale-100"
                />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{opt.label}</span>
                {opt.description && (
                  <span className="text-2xs text-ink-low">{opt.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
