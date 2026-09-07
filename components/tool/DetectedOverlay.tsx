"use client";

import { Sparkles, Brush } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DetectBox } from "@/lib/validation/jobs";

export interface DetectedOverlayProps {
  imageUrl: string;
  boxes: DetectBox[];
  originalWidth: number;
  originalHeight: number;
  onEraseDetected: () => void;
  onDrawManually: () => void;
  onCancel: () => void;
}

/**
 * DetectedOverlay (Section 8.1). Shows auto-detected overlay candidates in cyan
 * and asks the user to confirm — never auto-erases. Offers "Erase detected
 * areas" and "Draw it myself".
 */
export function DetectedOverlay({
  imageUrl,
  boxes,
  originalWidth,
  originalHeight,
  onEraseDetected,
  onDrawManually,
  onCancel,
}: DetectedOverlayProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <div
        className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-lg border border-line"
        style={{ aspectRatio: `${originalWidth} / ${originalHeight}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img src={imageUrl} alt="Detected areas" className="absolute inset-0 h-full w-full object-contain" />
        {boxes.map((b, i) => (
          <div
            key={i}
            className="absolute border-2 border-cyan bg-cyan/20"
            style={{
              left: `${(b.x / originalWidth) * 100}%`,
              top: `${(b.y / originalHeight) * 100}%`,
              width: `${(b.width / originalWidth) * 100}%`,
              height: `${(b.height / originalHeight) * 100}%`,
            }}
          />
        ))}
      </div>

      <p className="text-center text-sm text-ink-mid">
        {boxes.length > 0
          ? `Found ${boxes.length} area${boxes.length > 1 ? "s" : ""} that might be an overlay.`
          : "No overlays detected automatically — draw over what you want gone."}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {boxes.length > 0 && (
          <Button variant="primary" size="sm" leadingIcon={<Sparkles size={16} />} onClick={onEraseDetected}>
            Erase detected areas
          </Button>
        )}
        <Button variant="secondary" size="sm" leadingIcon={<Brush size={16} />} onClick={onDrawManually}>
          Draw it myself
        </Button>
      </div>
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Choose another image
        </Button>
      </div>
    </div>
  );
}
