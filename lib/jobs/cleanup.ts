import "server-only";
import { getStorage } from "@/lib/storage";
import { jobStore } from "@/lib/db/store";

/**
 * runCleanup — purge expired jobs and their objects (Section 13). Deletes the
 * input, output and preview from storage, then removes the job row. Backs the
 * "deleted within 24 hours" promise shown on every page. Run by the standalone
 * worker's cron and by the protected /api/cron/cleanup route.
 */
export async function runCleanup(now: Date = new Date()): Promise<{ purged: number }> {
  const store = await jobStore();
  const storage = getStorage();
  const expired = await store.listExpired(now);

  let purged = 0;
  for (const job of expired) {
    try {
      await storage.delete("inputs", job.inputKey);
      if (job.outputKey) await storage.delete("outputs", job.outputKey);
      if (job.previewKey) await storage.delete("outputs", job.previewKey);
      await store.remove(job.id);
      purged++;
    } catch (err) {
      console.error(`[cleanup] failed to purge job ${job.id}`, err);
    }
  }
  return { purged };
}
