import type { Metadata } from "next";
import { PhaseNotice } from "@/components/marketing/PhaseNotice";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with CLEANPLATE, or read the FAQ.",
};

export default function SupportPage() {
  return (
    <PhaseNotice
      eyebrow="Support"
      title="We're here to help"
      description="A contact form and a full FAQ land with the marketing build. In the meantime, reach us at support@cleanplate.app."
      phase="Phase 6"
    />
  );
}
