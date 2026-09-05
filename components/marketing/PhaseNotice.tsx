import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

export interface PhaseNoticeProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Which build phase delivers the full feature (Section 20). */
  phase: string;
  children?: ReactNode;
}

/**
 * PhaseNotice — an honest placeholder for routes whose full functionality lands
 * in a later build phase. Real chrome, real copy, no fake results. Replaced by
 * the actual page in its phase.
 */
export function PhaseNotice({
  eyebrow,
  title,
  description,
  phase,
  children,
}: PhaseNoticeProps) {
  return (
    <div className="container-page py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="label-eyebrow">{eyebrow}</span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        <p className="prose-measure mt-4 text-base text-ink-mid">{description}</p>
        <div className="mt-6">
          <Badge tone="amber">Ships in {phase}</Badge>
        </div>
        {children && <div className="mt-10 w-full">{children}</div>}
      </div>
    </div>
  );
}
