"use client";

import {
  createJobResponseSchema,
  jobStatusResponseSchema,
  type CreateJobRequest,
  type CreateJobResponse,
  type JobStatusResponse,
} from "@/lib/validation/jobs";
import { errorEnvelopeSchema } from "@/lib/validation/errors";

export class JobError extends Error {
  code: string;
  retryable: boolean;
  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "JobError";
    this.code = code;
    this.retryable = retryable;
  }
}

async function parseError(res: Response): Promise<JobError> {
  const json = await res.json().catch(() => null);
  const parsed = errorEnvelopeSchema.safeParse(json);
  if (parsed.success) {
    const e = parsed.data.error;
    return new JobError(e.code, e.message, e.retryable);
  }
  return new JobError("INTERNAL", "Something went wrong. Try again.", true);
}

export async function createJob(req: CreateJobRequest): Promise<CreateJobResponse> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw await parseError(res);
  const json = await res.json();
  const parsed = createJobResponseSchema.safeParse(json);
  if (!parsed.success) throw new JobError("INTERNAL", "Unexpected job response.", true);
  return parsed.data;
}

export interface PollOptions {
  onUpdate?: (status: JobStatusResponse) => void;
  signal?: AbortSignal;
  /** Overall cap before giving up (Section 9.3 fails past 60s). */
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Poll a job to a terminal state. Polls every 1500ms, backing off to 4000ms
 * after 20s (Section 7.2). Rejects on failure, cancellation, or overall timeout.
 */
export async function pollJob(jobId: string, opts: PollOptions = {}): Promise<JobStatusResponse> {
  const start = Date.now();
  const timeoutMs = opts.timeoutMs ?? 75_000;

  for (;;) {
    if (opts.signal?.aborted) throw new JobError("CANCELLED", "Cancelled.");
    if (Date.now() - start > timeoutMs) {
      throw new JobError("INFERENCE_TIMEOUT", "This one took too long and we stopped it. No charge. Try again?", true);
    }

    const res = await fetch(`/api/jobs/${jobId}`, { signal: opts.signal });
    if (!res.ok) throw await parseError(res);
    const parsed = jobStatusResponseSchema.safeParse(await res.json());
    if (!parsed.success) throw new JobError("INTERNAL", "Unexpected status response.", true);
    const status = parsed.data;
    opts.onUpdate?.(status);

    if (status.status === "done") return status;
    if (status.status === "failed") {
      throw new JobError(status.error?.code ?? "INFERENCE_FAILED", status.error?.message ?? "Processing failed.", true);
    }
    if (status.status === "cancelled") throw new JobError("CANCELLED", "Cancelled.");

    const elapsed = Date.now() - start;
    await sleep(elapsed > 20_000 ? 4000 : 1500);
  }
}
