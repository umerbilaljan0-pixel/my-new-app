import { Eraser, Scissors, Maximize2 } from "lucide-react";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ToolCard } from "@/components/marketing/ToolCard";
import { TRUST_LINE } from "@/lib/nav";

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="container-page py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          Three tools. One place.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <ToolCard
            icon={Eraser}
            name="Erase"
            href="/remove-watermark"
            description="Remove watermarks, logos, text and unwanted objects. Detects overlays automatically, or brush over anything you want gone."
          />
          <ToolCard
            icon={Scissors}
            name="Cut Out"
            href="/remove-background"
            description="Remove the background in one click. Clean edges on hair and fur. Export with transparency, a solid colour, or a new background."
          />
          <ToolCard
            icon={Maximize2}
            name="Upscale"
            href="/upscale-image"
            description="Sharpen and enlarge to 1080p, 2K or 4K. Recovers detail instead of just stretching pixels."
          />
        </div>
      </section>

      <HowItWorks />

      <section className="border-t border-line bg-sunken">
        <div className="container-page py-12 text-center">
          <p className="text-sm text-ink-mid">{TRUST_LINE}</p>
        </div>
      </section>
    </>
  );
}
