import type { Metadata } from "next";
import { ToolStudio } from "@/components/tool/ToolStudio";
import { TRUST_LINE } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Remove watermarks, logos & objects",
  description:
    "Erase watermarks, logos, text and unwanted objects. Automatic overlay detection or brush it yourself. No signup.",
};

export default function RemoveWatermarkPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="label-eyebrow">Erase</span>
        <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink sm:text-2xl">
          Remove watermarks, logos, text and objects
        </h1>
        <p className="prose-measure mt-4 text-base text-ink-mid">
          We detect overlays automatically — or brush over anything you want
          gone. Only what you paint changes; the rest of the image is untouched.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-[640px]">
        <ToolStudio initialTool="erase" />
        <p className="mt-4 text-center text-2xs text-ink-low">{TRUST_LINE}</p>
      </div>
    </div>
  );
}
