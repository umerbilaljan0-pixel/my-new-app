import "server-only";
import type { Job, NewJob } from "../types";
import type { JobStore } from "./types";
import type { Tool, JobParams, JobStatus } from "@/lib/validation/jobs";

/**
 * Postgres/Drizzle JobStore (production). drizzle-orm and the postgres driver are
 * imported dynamically so the local-dev path never loads them. Activated by
 * getJobStore() when DATABASE_URL is set.
 */

function iso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

// The row type is intentionally loose here to avoid importing the drizzle types
// at module scope; the mapping below is explicit and total.
function rowToJob(r: Record<string, unknown>): Job {
  return {
    id: r.id as string,
    userId: (r.userId as string) ?? null,
    sessionId: (r.sessionId as string) ?? null,
    tool: r.tool as Tool,
    status: r.status as JobStatus,
    params: r.params as JobParams,
    inputKey: r.inputKey as string,
    inputHash: r.inputHash as string,
    inputBytes: (r.inputBytes as number) ?? null,
    inputWidth: (r.inputWidth as number) ?? null,
    inputHeight: (r.inputHeight as number) ?? null,
    inputMime: (r.inputMime as string) ?? null,
    outputKey: (r.outputKey as string) ?? null,
    outputWidth: (r.outputWidth as number) ?? null,
    outputHeight: (r.outputHeight as number) ?? null,
    outputBytes: (r.outputBytes as number) ?? null,
    previewKey: (r.previewKey as string) ?? null,
    provider: (r.provider as string) ?? null,
    providerJobId: (r.providerJobId as string) ?? null,
    paramsHash: r.paramsHash as string,
    creditsCharged: (r.creditsCharged as number) ?? 0,
    errorCode: (r.errorCode as string) ?? null,
    errorMessage: (r.errorMessage as string) ?? null,
    queuedAt: iso(r.queuedAt as Date) ?? new Date().toISOString(),
    startedAt: iso(r.startedAt as Date),
    finishedAt: iso(r.finishedAt as Date),
    durationMs: (r.durationMs as number) ?? null,
    expiresAt: iso(r.expiresAt as Date) ?? new Date().toISOString(),
  };
}

/** Map a domain patch to snake/Date columns for an update. */
function patchToColumns(patch: Partial<Job>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const map: Record<string, string> = {
    status: "status",
    outputKey: "output_key",
    outputWidth: "output_width",
    outputHeight: "output_height",
    outputBytes: "output_bytes",
    previewKey: "preview_key",
    provider: "provider",
    providerJobId: "provider_job_id",
    inputBytes: "input_bytes",
    inputWidth: "input_width",
    inputHeight: "input_height",
    inputMime: "input_mime",
    creditsCharged: "credits_charged",
    errorCode: "error_code",
    errorMessage: "error_message",
    durationMs: "duration_ms",
  };
  const dateFields: Record<string, string> = {
    startedAt: "started_at",
    finishedAt: "finished_at",
  };
  for (const [k, v] of Object.entries(patch)) {
    if (k in map) out[map[k]!] = v;
    else if (k in dateFields) out[dateFields[k]!] = v ? new Date(v as string) : null;
  }
  return out;
}

export async function createPostgresJobStore(databaseUrl: string): Promise<JobStore> {
  const [{ drizzle }, postgres, { jobs }, orm] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("postgres").then((m) => m.default),
    import("../schema"),
    import("drizzle-orm"),
  ]);
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client);
  const { eq, and, desc, lte, sql } = orm;

  return {
    backend: "postgres",

    async create(input: NewJob): Promise<Job> {
      const [row] = await db
        .insert(jobs)
        .values({
          userId: input.userId,
          sessionId: input.sessionId,
          tool: input.tool,
          status: input.status ?? "queued",
          params: input.params,
          paramsHash: input.paramsHash,
          inputKey: input.inputKey,
          inputHash: input.inputHash,
          inputWidth: input.inputWidth ?? null,
          inputHeight: input.inputHeight ?? null,
          outputKey: input.outputKey ?? null,
          outputWidth: input.outputWidth ?? null,
          outputHeight: input.outputHeight ?? null,
          outputBytes: input.outputBytes ?? null,
          previewKey: input.previewKey ?? null,
          provider: input.provider ?? null,
          expiresAt: new Date(input.expiresAt),
        })
        .returning();
      return rowToJob(row as Record<string, unknown>);
    },

    async getById(id: string): Promise<Job | null> {
      const [row] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
      return row ? rowToJob(row as Record<string, unknown>) : null;
    },

    async update(id: string, patch: Partial<Job>): Promise<Job | null> {
      const cols = patchToColumns(patch);
      if (Object.keys(cols).length === 0) {
        const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
        return existing ? rowToJob(existing as Record<string, unknown>) : null;
      }
      const [row] = await db
        .update(jobs)
        .set(cols)
        .where(eq(jobs.id, id))
        .returning();
      return row ? rowToJob(row as Record<string, unknown>) : null;
    },

    async findCached(inputHash: string, tool: Tool, paramsHash: string): Promise<Job | null> {
      const [row] = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.inputHash, inputHash),
            eq(jobs.tool, tool),
            eq(jobs.paramsHash, paramsHash),
            eq(jobs.status, "done"),
          ),
        )
        .orderBy(desc(jobs.finishedAt))
        .limit(1);
      if (!row) return null;
      const job = rowToJob(row as Record<string, unknown>);
      if (new Date(job.expiresAt).getTime() <= Date.now() || !job.previewKey) return null;
      return job;
    },

    async claimNextQueued(): Promise<Job | null> {
      // Atomic claim with SKIP LOCKED so multiple workers don't collide.
      const rows = await db.execute(sql`
        UPDATE jobs SET status = 'processing', started_at = now()
        WHERE id = (
          SELECT id FROM jobs WHERE status = 'queued'
          ORDER BY queued_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
        )
        RETURNING *
      `);
      const row = (rows as unknown as Record<string, unknown>[])[0];
      return row ? rowToJob(row) : null;
    },

    async listExpired(now: Date): Promise<Job[]> {
      const rows = await db.select().from(jobs).where(lte(jobs.expiresAt, now));
      return (rows as Record<string, unknown>[]).map(rowToJob);
    },

    async remove(id: string): Promise<void> {
      await db.delete(jobs).where(eq(jobs.id, id));
    },
  };
}
