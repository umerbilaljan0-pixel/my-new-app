import type { Metadata } from "next";
import { PhaseNotice } from "@/components/marketing/PhaseNotice";
import { Uploader } from "@/components/tool/Uploader";

export const metadata: Metadata = {
  title: "Remove watermarks, logos & objects",
  description:
    "Erase watermarks, logos, text and unwanted objects from images. Automatic overlay detection or brush it yourself.",
};

export default function RemoveWatermarkPage() {
  return (
    <PhaseNotice
      eyebrow="Erase"
      title="Remove watermarks, logos, text and objects"
      description="Detects overlays automatically, or brush over anything you want gone. Only masked pixels change — everything else stays bit-identical."
      phase="Phase 4"
    >
      <div className="mx-auto max-w-[560px]">
        <Uploader />
      </div>
    </PhaseNotice>
  );
}
