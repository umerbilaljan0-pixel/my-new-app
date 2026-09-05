import type { Metadata } from "next";
import { PhaseNotice } from "@/components/marketing/PhaseNotice";
import { DropZone } from "@/components/tool/DropZone";

export const metadata: Metadata = {
  title: "Upscale images to 4K",
  description:
    "Sharpen and enlarge images to 1080p, 2K or 4K. Recovers detail instead of just stretching pixels.",
};

export default function UpscaleImagePage() {
  return (
    <PhaseNotice
      eyebrow="Upscale"
      title="Sharpen and enlarge to 1080p, 2K or 4K"
      description="Pick a target resolution — we choose the network scale, run it, then resample to your exact output. Recovers detail instead of stretching pixels."
      phase="Phase 4"
    >
      <div className="mx-auto max-w-[560px]">
        <DropZone />
      </div>
    </PhaseNotice>
  );
}
