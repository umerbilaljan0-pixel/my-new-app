"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { UPLIFT_TARGETS, type UpliftTarget } from "@/lib/validation/jobs";

export interface ResolutionPickerProps {
  sourceWidth: number;
  sourceHeight: number;
  onSelect: (target: UpliftTarget) => void;
  onCancel: () => void;
}

const LABELS: Record<UpliftTarget, string> = {
  "1080p": "1080p",
  "2k": "2K",
  "4k": "4K",
  "8k": "8K",
};
const EST_SECONDS: Record<UpliftTarget, number> = { "1080p": 4, "2k": 8, "4k": 15, "8k": 30 };
const CREDITS: Record<UpliftTarget, number> = { "1080p": 1, "2k": 1, "4k": 2, "8k": 3 };

function outputDims(sw: number, sh: number, longEdge: number) {
  const src = Math.max(sw, sh) || 1;
  const scale = longEdge / src;
  return { w: Math.round(sw * scale), h: Math.round(sh * scale), scale };
}

/**
 * ResolutionPicker (Section 8.3). Targets are output resolutions, not
 * multipliers. Shows exact output dimensions, an estimated size and time, and
 * the credit cost; greys out targets that would upscale beyond 4×.
 */
export function ResolutionPicker({ sourceWidth, sourceHeight, onSelect, onCancel }: ResolutionPickerProps) {
  const srcLong = Math.max(sourceWidth, sourceHeight);
  const targets = Object.keys(UPLIFT_TARGETS) as UpliftTarget[];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">Choose a size</h3>
        <span className="tabular text-2xs text-ink-low">
          Source {sourceWidth} × {sourceHeight}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {targets.map((t) => {
          const longEdge = UPLIFT_TARGETS[t];
          const { w, h, scale } = outputDims(sourceWidth, sourceHeight, longEdge);
          const tooBig = scale > 4;
          const estMB = ((w * h * 1.1) / (1024 * 1024)).toFixed(1);
          return (
            <button
              key={t}
              type="button"
              disabled={tooBig}
              onClick={() => onSelect(t)}
              className={cn(
                "flex items-center justify-between gap-4 rounded-md border p-3 text-left transition-colors duration-ui ease-brand",
                tooBig
                  ? "cursor-not-allowed border-line bg-sunken opacity-60"
                  : "border-line bg-surface hover:border-amber hover:bg-amber-tint",
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-ink">
                  {LABELS[t]} · <span className="tabular">{w} × {h}</span>
                </span>
                <span className="tabular text-2xs text-ink-low">
                  {tooBig
                    ? `Source is too small for ${LABELS[t]} — best result is 2K.`
                    : `~${estMB} MB · ~${EST_SECONDS[t]}s`}
                </span>
              </div>
              {!tooBig && (
                <span className="tabular shrink-0 text-2xs font-semibold text-amber-press">
                  {CREDITS[t]} credit{CREDITS[t] > 1 ? "s" : ""}
                </span>
              )}
            </button>
          );
        })}
        {srcLong >= UPLIFT_TARGETS["4k"] && (
          <p className="text-2xs text-ink-low">This image is already large — upscaling adds little.</p>
        )}
      </div>

      <div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Choose another image
        </Button>
      </div>
    </div>
  );
}
