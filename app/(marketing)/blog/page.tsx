import type { Metadata } from "next";
import { PhaseNotice } from "@/components/marketing/PhaseNotice";

export const metadata: Metadata = {
  title: "Blog",
  description: "How-to and comparison guides for cleaning up images.",
};

export default function BlogPage() {
  return (
    <PhaseNotice
      eyebrow="Blog"
      title="Guides and comparisons"
      description="How-to walkthroughs and honest comparisons for removing watermarks, cutting out backgrounds and upscaling. Seeded with the first six posts at launch."
      phase="Phase 6"
    />
  );
}
