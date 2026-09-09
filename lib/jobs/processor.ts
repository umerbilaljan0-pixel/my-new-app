import "server-only";
import { getStorage } from "@/lib/storage";
import { outputKey, previewKey } from "@/lib/storage/keys";
import { getInference } from "@/lib/inference";
import { jobStore } from "@/lib/db/store";
import type { Job } from "@/lib/db/types";
import { JOB_MAX_ATTEMPTS, JOB_TIMEOUT_MS } from "./config";
import { makePreview } from "./preview";
import { UPLIFT_TARGETS } from "@/lib/validation/jobs";
import { captureException } from "@/lib/observability/sentry";
import { refundCredits } from "@/lib/credits";
import type { ErrorCode } from "@/lib/validation/errors";

/**
 * runJob — the single place a job is executed, shared by the in-process
 * dispatcher (dev) and the standalone worker (production). Reads the input from
 * storage, runs the inference adapter, writes the full-resolution output and a
 * 1200px preview to the outputs bucket, records the result on the job.
 *
 * Enforces the 60s timeout (Section 9.3) and retries transient failures up to
 * JOB_MAX_ATTEMPTS with backoff, only marking the job `failed` after the final
 * attempt so pollers never see a transient failure between retries.
 */

class TimeoutError extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError("job timed out")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ProcessOutcome {
  status: "done" | "failed";
  errorCode?: ErrorCode;
}

export async function runJob(jobId: string): Promise<ProcessOutcome> {
  const store = await jobStore();
  const job = await store.getById(jobId);
  if (!job) return { status: "failed", errorCode: "JOB_NOT_FOUND" };
  if (job.status === "done") return { status: "done" };

  const startedAt = Date.now();
  await store.update(jobId, { status: "processing", startedAt: new Date().toISOString() });

  let lastErr: unknown;
  for (let attempt = 1; attempt <= JOB_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await withTimeout(runToolOnce(job), JOB_TIMEOUT_MS);
      await store.update(jobId, {
        status: "done",
        outputKey: result.outputKey,
        previewKey: result.previewKey,
        outputWidth: result.width,
        outputHeight: result.height,
        outputBytes: result.outputBytes,
        provider: result.provider,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
      });
      return { status: "done" };
    } catch (err) {
      lastErr = err;
      console.error(`[processor] job ${jobId} attempt ${attempt} failed`, err);
      if (attempt < JOB_MAX_ATTEMPTS && !(err instanceof TimeoutError)) {
        await sleep(1000 * attempt);
      } else {
        break;
      }
    }
  }

  const code: ErrorCode = lastErr instanceof TimeoutError ? "INFERENCE_TIMEOUT" : "INFERENCE_FAILED";
  void captureException(lastErr, { jobId, tool: job.tool, code });
  // Auto-refund any credits charged up front (API jobs). Interactive jobs are
  // charged at download, so they were never charged and this is a no-op.
  if (job.userId && job.creditsCharged > 0) {
    try {
      await refundCredits(job.userId, job.creditsCharged, jobId);
      await store.update(jobId, { creditsCharged: 0 });
    } catch (refundErr) {
      console.error(`[processor] refund failed for ${jobId}`, refundErr);
    }
  }
  await store.update(jobId, {
    status: "failed",
    errorCode: code,
    errorMessage: lastErr instanceof Error ? lastErr.message : "processing failed",
    durationMs: Date.now() - startedAt,
    finishedAt: new Date().toISOString(),
  });
  return { status: "failed", errorCode: code };
}

interface ToolResult {
  outputKey: string;
  previewKey: string;
  width: number;
  height: number;
  outputBytes: number;
  provider: string;
}

async function runToolOnce(job: Job): Promise<ToolResult> {
  const storage = getStorage();
  const inputBytes = await storage.get("inputs", job.inputKey);
  if (!inputBytes) throw new Error(`input object missing: ${job.inputKey}`);

  const inference = getInference();
  const contentType = job.inputMime ?? "image/png";
  let result;

  if (job.params.tool === "cutout") {
    result = await inference.removeBackground({ bytes: inputBytes, contentType, params: job.params });
  } else if (job.params.tool === "erase") {
    const maskBytes = await storage.get("inputs", job.params.maskKey);
    if (!maskBytes) throw new Error(`mask object missing: ${job.params.maskKey}`);
    result = await inference.inpaint({ bytes: inputBytes, contentType, maskBytes, params: job.params });
  } else if (job.params.tool === "uplift") {
    const targetLongEdge = UPLIFT_TARGETS[job.params.target];
    result = await inference.upscale({ bytes: inputBytes, contentType, targetLongEdge, params: job.params });
  } else {
    throw new Error(`tool not implemented: ${job.tool}`);
  }

  const oKey = outputKey(job.id);
  await storage.put("outputs", oKey, result.bytes, result.contentType);

  const previewBytes = await makePreview(result.bytes, result.width, result.height);
  const pKey = previewKey(job.id);
  await storage.put("outputs", pKey, previewBytes, "image/png");

  return {
    outputKey: oKey,
    previewKey: pKey,
    width: result.width,
    height: result.height,
    outputBytes: result.bytes.byteLength,
    provider: inference.provider,
  };
}
