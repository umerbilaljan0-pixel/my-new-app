import type { Metadata } from "next";
import { ToolStudio } from "@/components/tool/ToolStudio";
import { ToolContent } from "@/components/marketing/ToolContent";
import { VideoPreview } from "@/components/marketing/VideoPreview";
import { TOOL_CONTENT } from "@/lib/content/tools";
import { ogImage } from "@/lib/seo";
import { TRUST_LINE } from "@/lib/nav";

const c = TOOL_CONTENT["remove-watermark"];

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.metaDescription,
  alternates: { canonical: "/remove-watermark" },
  openGraph: { title: c.metaTitle, description: c.metaDescription, images: [ogImage(c.h1, "Erase · CLEANPLATE")] },
};

export default function RemoveWatermarkPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="label-eyebrow">{c.eyebrow}</span>
        <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink sm:text-2xl">{c.h1}</h1>
        <p className="prose-measure mt-4 text-base text-ink-mid">{c.intro}</p>
      </div>
      <div className="mx-auto mt-10 max-w-[640px]">
        <ToolStudio initialTool="erase" />
        <p className="mt-4 text-center text-2xs text-ink-low">{TRUST_LINE}</p>
      </div>
      <div className="mx-auto mt-14 max-w-2xl">
        <VideoPreview
          src="/media/watermark-eraser.mp4"
          label="Erasing a watermark and text from a photo while the background stays intact"
          className="shadow-float"
        />
        <p className="mt-3 text-center text-2xs text-ink-low">Watch text and watermarks vanish — the background is rebuilt behind them.</p>
      </div>
      <ToolContent content={c} />
    </div>
  );
}
