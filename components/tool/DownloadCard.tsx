"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { formatBytes } from "@/lib/format";

export interface DownloadCardProps {
  jobId: string;
  /** Full-resolution dimensions for the HD column. */
  width?: number;
  height?: number;
  bytes?: number;
}

/**
 * DownloadCard (Section 9.5). Free and full-resolution options side by side,
 * both always visible — the free option is never hidden. The free download
 * (1200px) works today; HD is credit-gated and routes to pricing until Phase 5
 * wires checkout.
 */
export function DownloadCard({ jobId, width, height, bytes }: DownloadCardProps) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-line sm:grid-cols-2">
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:border-b-0 sm:border-r">
        <div className="flex flex-col gap-0.5">
          <span className="label-eyebrow">Free</span>
          <span className="tabular text-2xs text-ink-low">1200px · PNG</span>
        </div>
        <a
          href={`/api/jobs/${jobId}/download?quality=preview`}
          download
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors duration-ui ease-brand hover:border-line-strong hover:bg-sunken active:scale-[0.98]"
        >
          <Download size={16} />
          Download free
        </a>
      </div>

      <div className="flex flex-col gap-3 bg-amber-tint/40 p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="label-eyebrow">Full resolution</span>
            <span className="tabular text-2xs text-ink-low">
              {width && height ? `${width} × ${height}` : "Full size"} · PNG
              {bytes ? ` · ${formatBytes(bytes)}` : ""}
            </span>
          </div>
          <span className="tabular text-2xs font-semibold text-amber-press">1 credit</span>
        </div>
        <Link
          href="/pricing"
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber px-5 text-sm font-semibold text-white transition-colors duration-ui ease-brand hover:bg-amber-press active:scale-[0.98]"
        >
          <Download size={16} />
          Download HD
        </Link>
      </div>
    </div>
  );
}
