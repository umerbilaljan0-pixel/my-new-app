"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Optional formatter for the value read-out (rendered in the mono face). */
  format?: (value: number) => string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Slider — range input styled to the system with a live mono read-out. The
 * amber fill is painted with a gradient driven by the current percentage so the
 * track reflects the value without extra DOM.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  format,
  disabled,
  id,
  className,
}: SliderProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {(label || format) && (
        <div className="flex items-baseline justify-between">
          {label && (
            <label htmlFor={fieldId} className="label-eyebrow">
              {label}
            </label>
          )}
          <span className="tabular text-2xs text-ink-mid">
            {format ? format(value) : value}
          </span>
        </div>
      )}
      <input
        id={fieldId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className={cn(
          "cp-slider h-1.5 w-full cursor-pointer appearance-none rounded-pill bg-line-strong outline-none",
          "focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          disabled && "cursor-not-allowed opacity-50",
        )}
        style={{
          background: `linear-gradient(to right, rgb(var(--amber)) 0%, rgb(var(--amber)) ${pct}%, rgb(var(--line-strong)) ${pct}%, rgb(var(--line-strong)) 100%)`,
        }}
      />
    </div>
  );
}
