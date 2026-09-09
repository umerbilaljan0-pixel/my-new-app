"use client";

import {
  createJobResponseSchema,
  type CreateJobResponse,
  type JobParams,
} from "@/lib/validation/jobs";
import { JobError } from "./client";

export interface IngestClientInput {
  inputKey: string;
  inputHash: string;
  params: JobParams;
  provider: string;
  blob: Blob;
  inputWidth?: number;
  inputHeight?: number;
}

/**
 * Submit a browser-computed result to POST /api/jobs/ingest, which registers it
 * as a finished job so it flows through the normal history/preview/download
 * path. Returns the created job id.
 */
export async function ingestClientResult(input: IngestClientInput): Promise<CreateJobResponse> {
  const form = new FormData();
  form.set("inputKey", input.inputKey);
  form.set("inputHash", input.inputHash);
  form.set("provider", input.provider);
  form.set("params", JSON.stringify(input.params));
  if (input.inputWidth) form.set("inputWidth", String(input.inputWidth));
  if (input.inputHeight) form.set("inputHeight", String(input.inputHeight));
  form.set("result", input.blob, "result.png");

  const res = await fetch("/api/jobs/ingest", { method: "POST", body: form });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const code = json?.error?.code ?? "INTERNAL";
    const message = json?.error?.message ?? "Couldn't save the result.";
    throw new JobError(code, message, json?.error?.retryable ?? true);
  }
  const parsed = createJobResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new JobError("INTERNAL", "Unexpected ingest response.", true);
  return parsed.data;
}
