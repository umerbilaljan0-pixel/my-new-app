import type { CutoutParams, EraseParams, UpliftParams } from "@/lib/validation/jobs";

export interface CutoutInput {
  bytes: Uint8Array;
  contentType: string;
  params: CutoutParams;
}

export interface EraseInput {
  bytes: Uint8Array;
  contentType: string;
  /** White-on-black mask PNG matching the input dimensions. */
  maskBytes: Uint8Array;
  params: EraseParams;
}

export interface UpscaleInput {
  bytes: Uint8Array;
  contentType: string;
  /** Exact output long-edge in px (system-derived from the chosen target). */
  targetLongEdge: number;
  params: UpliftParams;
}

export interface InferenceResult {
  /** Full-resolution output bytes. */
  bytes: Uint8Array;
  contentType: "image/png";
  width: number;
  height: number;
}

/**
 * Inference adapter (Section 13). Providers implement the same interface so
 * switching is a one-file change. Covers all three tools: CUTOUT (background
 * removal), ERASE (inpainting) and UPLIFT (upscaling).
 */
export interface InferenceAdapter {
  readonly provider: string;
  removeBackground(input: CutoutInput): Promise<InferenceResult>;
  inpaint(input: EraseInput): Promise<InferenceResult>;
  upscale(input: UpscaleInput): Promise<InferenceResult>;
}
