import type { Metadata } from "next";
import { ToolRunner } from "@/components/tool/ToolRunner";
import { TRUST_LINE } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Remove image background",
  description:
    "Remove the background from any image in one click. Clean edges, export with transparency. No signup.",
};

export default function RemoveBackgroundPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="label-eyebrow">Cut Out</span>
        <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink sm:text-2xl">
          Remove the background in one click
        </h1>
        <p className="prose-measure mt-4 text-base text-ink-mid">
          Drop an image and get a clean cut-out with transparency. Works best on
          product shots and clear subjects. No account, results in seconds.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-[640px]">
        <ToolRunner
          params={{ tool: "cutout", background: "transparent", feather: 0 }}
          processingStages={["Analysing image", "Isolating subject", "Refining edges", "Finishing"]}
        />
        <p className="mt-4 text-center text-2xs text-ink-low">{TRUST_LINE}</p>
      </div>
    </div>
  );
}
