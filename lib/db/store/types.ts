import type { Job, NewJob } from "../types";
import type { Tool } from "@/lib/validation/jobs";

/**
 * JobStore — the persistence boundary for jobs. A Postgres/Drizzle implementation
 * backs production; a file-backed local store backs dev with no database. Both
 * return the same domain Job.
 */
export interface JobStore {
  readonly backend: "postgres" | "local";
  create(job: NewJob): Promise<Job>;
  getById(id: string): Promise<Job | null>;
  update(id: string, patch: Partial<Job>): Promise<Job | null>;
  /** A finished, non-expired job with the same input+tool+params (cache hit). */
  findCached(inputHash: string, tool: Tool, paramsHash: string): Promise<Job | null>;
  /** Atomically claim one queued job → processing (for the standalone worker). */
  claimNextQueued(): Promise<Job | null>;
  /** Jobs whose expires_at has passed (cleanup cron). */
  listExpired(now: Date): Promise<Job[]>;
  /** Remove a job row entirely (after its objects are purged). */
  remove(id: string): Promise<void>;
}
