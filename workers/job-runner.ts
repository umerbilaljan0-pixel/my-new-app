/**
 * Standalone job worker (Section 13). A long-running Node process that claims
 * queued jobs from the store and processes them, and periodically runs the
 * cleanup cron. Intended for production alongside Postgres; run the app with
 * INLINE_WORKER=false so it doesn't also process in-process.
 *
 * Run locally with env loaded, e.g.:
 *   INLINE_WORKER=false node --env-file=.env --import tsx workers/job-runner.ts
 */
import { jobStore } from "@/lib/db/store";
import { runJob } from "@/lib/jobs/processor";
import { runCleanup } from "@/lib/jobs/cleanup";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 1000);
const CLEANUP_EVERY_MS = 5 * 60_000;

let stopping = false;

async function pollLoop() {
  const store = await jobStore();
  while (!stopping) {
    try {
      const job = await store.claimNextQueued();
      if (job) {
        console.log(`[worker] processing job ${job.id} (${job.tool})`);
        await runJob(job.id);
      } else {
        await sleep(POLL_MS);
      }
    } catch (err) {
      console.error("[worker] poll error", err);
      await sleep(POLL_MS);
    }
  }
}

async function cleanupLoop() {
  while (!stopping) {
    try {
      const { purged } = await runCleanup();
      if (purged > 0) console.log(`[worker] cleanup purged ${purged} expired job(s)`);
    } catch (err) {
      console.error("[worker] cleanup error", err);
    }
    await sleep(CLEANUP_EVERY_MS);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shutdown() {
  stopping = true;
  console.log("[worker] shutting down");
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[worker] starting");
void Promise.all([pollLoop(), cleanupLoop()]);
