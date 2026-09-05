import type { ReactNode } from "react";
import { api, type Job } from "@/lib/api";
import { useStore, jobList } from "@/state/store";
import { ICancel, IDownload, IPause, IPlay, IRetry } from "./icons";
import { seconds } from "@/lib/format";

const STATUS_COLOR: Record<Job["status"], string> = {
  queued: "var(--text-low)",
  running: "var(--accent)",
  paused: "var(--text-mid)",
  done: "var(--ok)",
  error: "var(--danger)",
  cancelled: "var(--text-low)",
};

export function QueueBar() {
  const jobs = useStore((s) => s.jobs);
  const open = useStore((s) => s.queueOpen);
  const setOpen = useStore((s) => s.setQueueOpen);
  const list = jobList(jobs);

  return (
    <div
      className="shrink-0 border-t border-border bg-bg-surface flex flex-col transition-all duration-panel"
      style={{ height: open ? "var(--bottom-bar)" : 32 }}
    >
      <button
        className="flex items-center gap-2 px-3 h-8 shrink-0 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="label">Queue</span>
        <span className="num text-[11px] text-text-low">{list.length}</span>
        {list.some((j) => j.status === "running") && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        )}
        <span className="ml-auto text-text-low text-[11px]">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-2 px-3 pb-3">
          {list.length === 0 && (
            <div className="grid place-items-center w-full text-[12px] text-text-low">
              No jobs yet — load media and run a tool.
            </div>
          )}
          {list.map((j) => (
            <QueueCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({ job }: { job: Job }) {
  const thumb = job.thumbnail ? api.fileUrl(job.thumbnail) : null;
  const pct = Math.round(job.progress * 100);
  return (
    <div className="card shrink-0 w-64 h-[72px] flex overflow-hidden p-0" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="w-[72px] h-full bg-bg-void grid place-items-center shrink-0 border-r border-border">
        {thumb ? (
          <img src={thumb} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="num text-[10px] text-text-low">{pct}%</span>
        )}
      </div>
      <div className="flex-1 min-w-0 p-2 flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[job.status] }} />
          <span className="text-[12px] font-medium capitalize truncate">{job.tool}</span>
          <span className="num text-[10px] text-text-low ml-auto shrink-0">
            {job.stage_count > 1 ? `${(job.stage_index ?? 0) + 1}/${job.stage_count}` : ""}
          </span>
        </div>
        <div className="text-[10px] text-text-low truncate mt-0.5">
          {job.status === "error" ? job.error : job.stage || job.message || job.status}
        </div>
        {/* progress */}
        <div className="mt-auto h-1 rounded-full bg-bg-void overflow-hidden">
          <div className="h-full transition-all duration-ui"
            style={{ width: `${pct}%`, background: STATUS_COLOR[job.status] }} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="num text-[10px] text-text-low">
            {job.status === "running" ? seconds(job.eta_seconds) : ""}
          </span>
          <div className="ml-auto flex items-center gap-0.5 text-text-low">
            {job.status === "running" && <IconBtn onClick={() => api.pause(job.id)}><IPause /></IconBtn>}
            {job.status === "paused" && <IconBtn onClick={() => api.resume(job.id)}><IPlay /></IconBtn>}
            {(job.status === "running" || job.status === "queued" || job.status === "paused") && (
              <IconBtn onClick={() => api.cancel(job.id)}><ICancel /></IconBtn>
            )}
            {(job.status === "error" || job.status === "cancelled") && (
              <IconBtn onClick={() => api.retry(job.id)}><IRetry /></IconBtn>
            )}
            {job.status === "done" && job.output_path && (
              <a className="w-6 h-6 grid place-items-center rounded hover:text-text-hi"
                href={api.outputUrl(job.id)} target="_blank" rel="noreferrer" title="Reveal / download">
                <IDownload />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-6 h-6 grid place-items-center rounded hover:text-text-hi transition-colors">
      {children}
    </button>
  );
}
