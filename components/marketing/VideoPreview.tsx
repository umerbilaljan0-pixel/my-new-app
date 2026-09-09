"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface VideoPreviewProps {
  /** Path under /public, e.g. "/media/showcase.mp4". */
  src: string;
  /** Accessible description of the animation (it is decorative but labelled). */
  label: string;
  /** Extra classes on the frame (e.g. max-width, shadow). */
  className?: string;
  /** Fallback aspect ratio used for the skeleton until metadata loads. */
  aspect?: string;
  /** Eager-load (hero) vs. lazy metadata (below-the-fold tool pages). */
  priority?: boolean;
}

/**
 * VideoPreview — a looping, muted, autoplaying demo clip in a clean responsive
 * frame. Shows a skeleton shimmer until the first frame is ready, then fades the
 * video in. The frame adopts the video's true aspect ratio once metadata loads,
 * so it never crops or letterboxes regardless of the source orientation.
 *
 * Autoplay is kept unblockable: muted + playsInline + autoPlay is the allowed
 * combination on every modern browser, and we also force `muted` and nudge
 * play() programmatically (some engines ignore the attribute on hydration).
 */
export function VideoPreview({
  src,
  label,
  className,
  aspect = "16 / 9",
  priority = false,
}: VideoPreviewProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [ratio, setRatio] = useState(aspect);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // belt-and-suspenders: guarantees autoplay isn't blocked
    const tryPlay = () => void v.play().catch(() => {});
    tryPlay();
    // Re-attempt when the tab becomes visible (autoplay can be deferred).
    const onVis = () => { if (!document.hidden) tryPlay(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-line bg-sunken",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      {!ready && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-sunken via-surface to-sunken"
          aria-hidden="true"
        />
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- decorative, muted, no audio track */}
      <video
        ref={ref}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload={priority ? "auto" : "metadata"}
        aria-label={label}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) setRatio(`${v.videoWidth} / ${v.videoHeight}`);
        }}
        onLoadedData={() => {
          setReady(true);
          ref.current?.play?.().catch(() => {});
        }}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500 ease-brand",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
