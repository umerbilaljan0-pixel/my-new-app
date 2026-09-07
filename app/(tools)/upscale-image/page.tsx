import type { Metadata } from "next";
import { ToolStudio } from "@/components/tool/ToolStudio";
import { TRUST_LINE } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Upscale images to 4K",
  description:
    "Sharpen and enlarge images to 1080p, 2K or 4K. Recovers detail instead of just stretching pixels. No signup.",
};

export default function UpscaleImagePage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="label-eyebrow">Upscale</span>
        <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink sm:text-2xl">
          Sharpen and enlarge to 1080p, 2K or 4K
        </h1>
        <p className="prose-measure mt-4 text-base text-ink-mid">
          Pick an output resolution — we handle the rest and resample to the
          exact size, preserving the aspect ratio. No account, results in seconds.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-[640px]">
        <ToolStudio initialTool="uplift" />
        <p className="mt-4 text-center text-2xs text-ink-low">{TRUST_LINE}</p>
      </div>
    </div>
  );
}
