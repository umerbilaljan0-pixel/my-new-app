/// <reference lib="webworker" />
import { processImageFile } from "./pipeline";
import { ImageProcessError, type WorkerRequest, type WorkerResponse } from "./types";

/**
 * Image-processing Web Worker (Section 15 — keep the UI thread free). Receives a
 * File, runs the pipeline, posts back the ProcessedImage or a typed error.
 */
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, file } = e.data;
  try {
    const result = await processImageFile(file);
    const msg: WorkerResponse = { id, ok: true, result };
    (self as unknown as Worker).postMessage(msg);
  } catch (err) {
    const code =
      err instanceof ImageProcessError ? err.code : "DECODE_FAILED";
    const message =
      err instanceof Error ? err.message : "We couldn't process that image.";
    const msg: WorkerResponse = { id, ok: false, code, message };
    (self as unknown as Worker).postMessage(msg);
  }
};
