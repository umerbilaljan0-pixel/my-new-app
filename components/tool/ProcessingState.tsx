"use client";

import { useEffect, useState } from "react";

export interface ProcessingStateProps {
  /** Original image URL to keep on screen during processing (Section 9.3). */
  imageUrl: string;
  /** Ordered status labels; the visible one advances with elapsed time. */
  stages?: string[];
}

const DEFAULT_STAGES = [
  "Analysing image",
  "Isolating subject",
  "Refining edges",
  "Finishing",
];

/**
 * ProcessingState (Section 9.3). Keeps the user's image on screen under a soft
 * diagonal shimmer, shows a status line that advances and a mono elapsed timer,
 * and announces changes via aria-live. Past 25s it notes larger images take
 * longer. The caller fails the job past ~60s.
 */
export function ProcessingState({ imageUrl, stages = DEFAULT_STAGES }: ProcessingStateProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(t);
  }, []);

  const stageIndex = Math.min(stages.length - 1, Math.floor(elapsed / 2));
  const stage = stages[stageIndex] ?? stages[stages.length - 1]!;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img
          src={imageUrl}
          alt="Processing your image"
          className="checkerboard max-h-[320px] w-full object-contain"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-shimmer"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, rgb(var(--amber) / 0.2) 50%, transparent 70%)",
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-pill bg-amber" />
          <span aria-live="polite" className="text-sm font-medium text-ink">
            {stage}
          </span>
        </div>
        <span className="tabular text-2xs text-ink-low">{elapsed}s</span>
      </div>
      {elapsed >= 25 && (
        <p className="border-t border-line px-4 py-2 text-2xs text-ink-low">
          Still working — larger images take longer.
        </p>
      )}
    </div>
  );
}
