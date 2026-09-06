import type { JobParams, JobStatus, Tool } from "@/lib/validation/jobs";

/**
 * Domain Job — the shape the app works with (camelCase, Dates as ISO strings in
 * the local store, real Dates from Postgres). Both JobStore implementations
 * return this shape so callers never depend on the backend.
 */
export interface Job {
  id: string;
  userId: string | null;
  sessionId: string | null;
  tool: Tool;
  status: JobStatus;
  params: JobParams;

  inputKey: string;
  inputHash: string;
  inputBytes: number | null;
  inputWidth: number | null;
  inputHeight: number | null;
  inputMime: string | null;

  outputKey: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
  outputBytes: number | null;
  previewKey: string | null;

  provider: string | null;
  providerJobId: string | null;
  paramsHash: string;

  creditsCharged: number;

  errorCode: string | null;
  errorMessage: string | null;

  queuedAt: string; // ISO
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  expiresAt: string; // ISO
}

/** Fields set when creating a job. */
export interface NewJob {
  userId: string | null;
  sessionId: string | null;
  tool: Tool;
  params: JobParams;
  paramsHash: string;
  inputKey: string;
  inputHash: string;
  inputWidth?: number | null;
  inputHeight?: number | null;
  /** Pre-filled output/preview keys when created from a cache hit. */
  status?: JobStatus;
  outputKey?: string | null;
  outputWidth?: number | null;
  outputHeight?: number | null;
  outputBytes?: number | null;
  previewKey?: string | null;
  provider?: string | null;
  expiresAt: string;
}
