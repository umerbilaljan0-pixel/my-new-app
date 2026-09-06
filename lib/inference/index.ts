import "server-only";
import type { InferenceAdapter } from "./types";
import { createLocalInference } from "./local";
import { createReplicateInference } from "./replicate";

/**
 * getInference() — Replicate when REPLICATE_API_TOKEN is set, otherwise the local
 * sharp-based background remover (dev / self-host). One-line provider swap.
 */
let cached: InferenceAdapter | null = null;
let warned = false;

export function getInference(): InferenceAdapter {
  if (cached) return cached;
  const token = process.env.REPLICATE_API_TOKEN;
  if (token) {
    cached = createReplicateInference({
      apiToken: token,
      cutoutVersion: process.env.REPLICATE_CUTOUT_VERSION,
    });
  } else {
    if (!warned) {
      console.warn(
        "[inference] REPLICATE_API_TOKEN not set — using the local background remover (dev).",
      );
      warned = true;
    }
    cached = createLocalInference();
  }
  return cached;
}

export type { InferenceAdapter, CutoutInput, InferenceResult } from "./types";
