"use client";

import { processImageFile } from "./pipeline";
import {
  ImageProcessError,
  type ProcessedImage,
  type WorkerRequest,
  type WorkerResponse,
} from "./types";

/**
 * Client entry point for image processing. Prefers a Web Worker so the UI never
 * freezes on large files (Section 15); transparently falls back to main-thread
 * processing if workers or OffscreenCanvas aren't available.
 */

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (r: ProcessedImage) => void; reject: (e: unknown) => void }
>();

function workerSupported(): boolean {
  return (
    typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
  );
}

function getWorker(): Worker | null {
  if (!workerSupported()) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./imageWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.ok) entry.resolve(msg.result);
      else entry.reject(new ImageProcessError(msg.code, msg.message));
    };
    worker.onerror = () => {
      // A worker-level error rejects everything in flight; callers fall back.
      for (const [, entry] of pending) entry.reject(new Error("worker error"));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

/** Process a file, returning the upload-ready ProcessedImage. */
export async function processImage(file: File): Promise<ProcessedImage> {
  const w = getWorker();
  if (!w) return processImageFile(file); // main-thread fallback

  return new Promise<ProcessedImage>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    const req: WorkerRequest = { id, file };
    try {
      w.postMessage(req);
    } catch (err) {
      pending.delete(id);
      // If posting fails, try the main thread rather than hard-failing.
      processImageFile(file).then(resolve, () => reject(err));
    }
  });
}
