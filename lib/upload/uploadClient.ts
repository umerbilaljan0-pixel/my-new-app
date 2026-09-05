"use client";

import { processImage } from "@/lib/image/process";
import type { ProcessedImage } from "@/lib/image/types";
import {
  errorEnvelopeSchema,
  uploadResponseSchema,
} from "@/lib/validation";

/**
 * The client upload orchestrator (Sections 7.2 / 9.2):
 *   process (worker) → POST /api/upload for a presigned URL → PUT the bytes
 *   directly with real progress → resolve with the stored key.
 *
 * Every async step has a timeout, the PUT retries transient failures, and the
 * whole thing is cancellable.
 */

export class UploadError extends Error {
  code: string;
  retryable: boolean;
  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface UploadResult {
  key: string;
  processed: ProcessedImage;
}

export interface UploadCallbacks {
  /** Fired while the worker processes the image (resize/strip/hash). */
  onProcessing?: () => void;
  /** Fired once processing is done and the byte upload begins. */
  onUploadStart?: (processed: ProcessedImage) => void;
  /** Real byte progress during the PUT. */
  onProgress?: (loaded: number, total: number) => void;
}

export interface UploadHandle {
  promise: Promise<UploadResult>;
  cancel: () => void;
}

const PRESIGN_TIMEOUT = 15_000;
const PUT_TIMEOUT = 60_000;
const PUT_RETRIES = 2;

function put(
  url: string,
  blob: Blob,
  contentType: string,
  opts: {
    onProgress?: (loaded: number, total: number) => void;
    signal: AbortSignal;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (opts.signal.aborted) {
      reject(new UploadError("CANCELLED", "Upload cancelled."));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.timeout = PUT_TIMEOUT;

    const onAbort = () => xhr.abort();
    opts.signal.addEventListener("abort", onAbort, { once: true });

    const done = () => opts.signal.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded, e.total);
    };
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else
        reject(
          new UploadError(
            "UPLOAD_FAILED",
            "The upload didn't finish. Check your connection and try again.",
            true,
          ),
        );
    };
    xhr.onerror = () => {
      done();
      reject(new UploadError("UPLOAD_FAILED", "Network error during upload.", true));
    };
    xhr.ontimeout = () => {
      done();
      reject(new UploadError("UPLOAD_FAILED", "The upload timed out.", true));
    };
    xhr.onabort = () => {
      done();
      reject(new UploadError("CANCELLED", "Upload cancelled."));
    };
    xhr.send(blob);
  });
}

async function requestPresign(
  processed: ProcessedImage,
  filename: string,
  signal: AbortSignal,
): Promise<{ uploadUrl: string; key: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRESIGN_TIMEOUT);
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        contentType: processed.contentType,
        bytes: processed.bytes,
        sha256: processed.sha256,
      }),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const parsed = errorEnvelopeSchema.safeParse(json);
      if (parsed.success) {
        const e = parsed.data.error;
        throw new UploadError(e.code, e.message, e.retryable);
      }
      throw new UploadError("UPLOAD_FAILED", "Couldn't start the upload.", true);
    }
    const ok = uploadResponseSchema.safeParse(json);
    if (!ok.success) {
      throw new UploadError("UPLOAD_FAILED", "Unexpected upload response.", true);
    }
    return { uploadUrl: ok.data.uploadUrl, key: ok.data.key };
  } catch (err) {
    if (err instanceof UploadError) throw err;
    if (signal.aborted) throw new UploadError("CANCELLED", "Upload cancelled.");
    throw new UploadError("UPLOAD_FAILED", "Couldn't reach the server.", true);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function startUpload(
  file: File,
  callbacks: UploadCallbacks = {},
): UploadHandle {
  const controller = new AbortController();
  const { signal } = controller;

  const promise = (async (): Promise<UploadResult> => {
    // 1. Process (worker).
    callbacks.onProcessing?.();
    const processed = await processImage(file);
    if (signal.aborted) throw new UploadError("CANCELLED", "Upload cancelled.");

    // 2. Presign.
    const { uploadUrl, key } = await requestPresign(processed, file.name, signal);

    // 3. PUT with retry on transient failures.
    callbacks.onUploadStart?.(processed);
    let attempt = 0;
    for (;;) {
      try {
        await put(uploadUrl, processed.blob, processed.contentType, {
          onProgress: callbacks.onProgress,
          signal,
        });
        break;
      } catch (err) {
        const retryable = err instanceof UploadError && err.retryable;
        if (!retryable || attempt >= PUT_RETRIES || signal.aborted) throw err;
        attempt += 1;
        await sleep(2000 * attempt);
      }
    }

    return { key, processed };
  })();

  return { promise, cancel: () => controller.abort() };
}
