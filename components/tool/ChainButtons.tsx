"use client";

import { ArrowRight, Eraser, Scissors, Maximize2, type LucideIcon } from "lucide-react";
import type { Tool } from "@/lib/validation/jobs";

export interface ChainButtonsProps {
  currentTool: Tool;
  onChain: (tool: Tool) => void;
}

const CHAIN: Record<Tool, { label: string; icon: LucideIcon }> = {
  cutout: { label: "Now remove the background", icon: Scissors },
  uplift: { label: "Now upscale to 4K", icon: Maximize2 },
  erase: { label: "Now erase something else", icon: Eraser },
};

/**
 * ChainButtons (Section 8.4) — the retention loop. Offers the other two tools
 * applied to the current result with zero re-upload.
 */
export function ChainButtons({ currentTool, onChain }: ChainButtonsProps) {
  const others = (Object.keys(CHAIN) as Tool[]).filter((t) => t !== currentTool);
  return (
    <div className="flex flex-col gap-2">
      <p className="label-eyebrow text-center">Keep going</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {others.map((t) => {
          const { label, icon: Icon } = CHAIN[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChain(t)}
              className="group inline-flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors duration-ui ease-brand hover:border-amber hover:bg-amber-tint"
            >
              <span className="inline-flex items-center gap-2">
                <Icon size={16} aria-hidden />
                {label}
              </span>
              <ArrowRight size={15} className="text-ink-low transition-transform duration-ui ease-brand group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
