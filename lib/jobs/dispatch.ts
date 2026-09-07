import "server-only";
import { runJob } from "./processor";

/**
 * dispatch — hand a freshly-created job to be processed.
 *
 * In dev (and any single-instance deploy) the job runs in-process, off the
 * request path, so the app works end-to-end with `pnpm dev` and no worker.
 * Set INLINE_WORKER=false when running the standalone worker (workers/job-runner)
 * so the app only enqueues and the worker picks jobs up from the store.
 */
export function dispatch(jobId: string): void {
  if (process.env.INLINE_WORKER === "false") return;
  // Fire-and-forget; runJob persists its own outcome. Keep the promise
  // referenced so the rejection (already handled inside) isn't flagged.
  void Promise.resolve().then(() => runJob(jobId)).catch((err) => {
    console.error(`[dispatch] job ${jobId} crashed`, err);
  });
}
