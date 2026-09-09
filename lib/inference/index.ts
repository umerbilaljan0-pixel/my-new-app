import "server-only";
import type { InferenceAdapter } from "./types";
import { createLocalInference } from "./local";
import { createReplicateInference } from "./replicate";
import { createFalInference } from "./fal";

/**
 * getInference() picks the server-side inference provider, best-available first:
 *   1. Fal.ai       when FAL_KEY is set       (RMBG / LaMa / Real-ESRGAN)
 *   2. Replicate    when REPLICATE_API_TOKEN  (BiRefNet/RMBG / LaMa / Real-ESRGAN)
 *   3. Local sharp  otherwise                 (dev / self-host, no credentials)
 *
 * All three implement the same interface so switching is configuration-only.
 * The browser (client-side WASM) is a separate, free path handled in the UI;
 * this is the server path used by the API, batch, chaining and no-JS fallback.
 */
let cached: InferenceAdapter | null = null;
let warned = false;

export function getInference(): InferenceAdapter {
  if (cached) return cached;
  const falKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (falKey) {
    cached = createFalInference({
      apiKey: falKey,
      cutoutModel: process.env.FAL_CUTOUT_MODEL,
      eraseModel: process.env.FAL_ERASE_MODEL,
      upscaleModel: process.env.FAL_UPSCALE_MODEL,
    });
  } else if (replicateToken) {
    cached = createReplicateInference({
      apiToken: replicateToken,
      cutoutVersion: process.env.REPLICATE_CUTOUT_VERSION,
      eraseVersion: process.env.REPLICATE_ERASE_VERSION,
      upscaleVersion: process.env.REPLICATE_UPSCALE_VERSION,
    });
  } else {
    if (!warned) {
      console.warn(
        "[inference] No FAL_KEY or REPLICATE_API_TOKEN — using the local sharp engine (dev/self-host).",
      );
      warned = true;
    }
    cached = createLocalInference();
  }
  return cached;
}

export type { InferenceAdapter, CutoutInput, InferenceResult } from "./types";
