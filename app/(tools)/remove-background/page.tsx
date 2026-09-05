import type { Metadata } from "next";
import { PhaseNotice } from "@/components/marketing/PhaseNotice";
import { DropZone } from "@/components/tool/DropZone";

export const metadata: Metadata = {
  title: "Remove image background",
  description:
    "Remove the background from any image in one click. Clean edges on hair and fur. Export transparent, on a colour, or a new background.",
};

export default function RemoveBackgroundPage() {
  return (
    <PhaseNotice
      eyebrow="Cut Out"
      title="Remove the background in one click"
      description="Clean edges on hair and fur with a true alpha channel. Export with transparency, a solid colour, a gradient, or a new background."
      phase="Phase 3"
    >
      <div className="mx-auto max-w-[560px]">
        <DropZone />
      </div>
    </PhaseNotice>
  );
}
