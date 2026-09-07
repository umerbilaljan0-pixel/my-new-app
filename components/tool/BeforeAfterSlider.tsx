"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  /** Show a checkerboard behind the "after" image (transparency). */
  afterTransparent?: boolean;
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * BeforeAfterSlider (Section 9.4). Draggable vertical divider with a circular
 * cyan handle — mouse, touch and keyboard (arrow keys). On arrival it sweeps
 * once 0 → 100 → 50 over 900ms, then rests, unless reduced-motion is set.
 */
export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  afterTransparent,
  className,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const draggingRef = useRef(false);

  // One-time auto-sweep on mount.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setPos(50);
      return;
    }
    let raf = 0;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // 0 → 100 → 50 easing.
      let p: number;
      if (t < 0.5) p = (t / 0.5) * 100;
      else p = 100 - ((t - 0.5) / 0.5) * 50;
      setPos(p);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => draggingRef.current && setFromClientX(e.clientX);
    const onUp = () => (draggingRef.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setFromClientX]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full select-none overflow-hidden rounded-xl border border-line",
        afterTransparent && "checkerboard",
        className,
      )}
      onMouseDown={(e) => {
        draggingRef.current = true;
        setFromClientX(e.clientX);
      }}
      onTouchStart={(e) => e.touches[0] && setFromClientX(e.touches[0].clientX)}
      onTouchMove={(e) => e.touches[0] && setFromClientX(e.touches[0].clientX)}
    >
      {/* After (revealed on the right) */}
      {/* eslint-disable-next-line @next/next/no-img-element -- signed blob/preview URL */}
      <img
        src={afterUrl}
        alt="After"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      {/* Before (clipped to the left of the divider) */}
      <div
        className="absolute inset-0 bg-surface"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img
          src={beforeUrl}
          alt="Before"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-sm bg-ink/70 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-paper">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-sm bg-ink/70 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-paper">
        After
      </span>

      {/* Divider + handle */}
      <div
        className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-cyan"
        style={{ left: `${pos}%` }}
      >
        <button
          type="button"
          role="slider"
          aria-label="Compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onMouseDown={() => (draggingRef.current = true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 2));
            else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 2));
            else if (e.key === "Home") setPos(0);
            else if (e.key === "End") setPos(100);
          }}
          className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-pill border-2 border-cyan bg-surface shadow-float focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="text-cyan">
            <path d="M6 4 2 8l4 4M10 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
