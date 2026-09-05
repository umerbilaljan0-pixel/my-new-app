import type { Metadata } from "next";
import { PhaseNotice } from "@/components/marketing/PhaseNotice";

export const metadata: Metadata = {
  title: "API",
  description: "The CLEANPLATE public API for the three tools. Studio tier.",
};

export default function ApiDocsPage() {
  return (
    <PhaseNotice
      eyebrow="Developers"
      title="CLEANPLATE API"
      description="A REST API for all three tools with bearer-key auth, optional completion webhooks, and generated Node and Python clients. Available on Studio."
      phase="Phase 8"
    />
  );
}
