import { Download } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBytes } from "@/lib/format";
import type { Job } from "@/lib/db/types";
import type { JobStatus } from "@/lib/validation/jobs";

const TOOL_LABEL: Record<string, string> = { cutout: "Cut Out", erase: "Erase", uplift: "Upscale" };
const STATUS_TONE: Record<JobStatus, BadgeTone> = {
  queued: "neutral",
  uploading: "neutral",
  processing: "warn",
  done: "ok",
  failed: "danger",
  cancelled: "neutral",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * JobList — a user's processed jobs (dashboard / history). Thumbnails load
 * through the ownership-checked download endpoint; results re-download for 30
 * days (Section 4).
 */
export function JobList({ jobs, emptyHint }: { jobs: Job[]; emptyHint?: string }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No jobs yet"
        description={emptyHint ?? "Your processed images will show up here for 30 days."}
      />
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
      {jobs.map((job) => (
        <li key={job.id} className="flex items-center gap-4 p-3">
          <div className="checkerboard h-14 w-14 shrink-0 overflow-hidden rounded-md border border-line">
            {job.status === "done" && job.previewKey ? (
              /* eslint-disable-next-line @next/next/no-img-element -- signed via ownership-checked endpoint */
              <img
                src={`/api/jobs/${job.id}/download?quality=preview`}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{TOOL_LABEL[job.tool] ?? job.tool}</span>
              <Badge tone={STATUS_TONE[job.status]}>{job.status}</Badge>
            </div>
            <p className="tabular mt-0.5 text-2xs text-ink-low">
              {job.outputWidth && job.outputHeight ? `${job.outputWidth} × ${job.outputHeight} · ` : ""}
              {job.outputBytes ? `${formatBytes(job.outputBytes)} · ` : ""}
              {timeAgo(job.queuedAt)}
            </p>
          </div>
          {job.status === "done" && (
            <a
              href={`/api/jobs/${job.id}/download?quality=preview`}
              download
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-2xs font-semibold text-ink transition-colors hover:border-line-strong hover:bg-sunken"
            >
              <Download size={14} />
              Free
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
