import type { CutoutParams } from "@/lib/validation/jobs";

export interface CutoutInput {
  bytes: Uint8Array;
  contentType: string;
  params: CutoutParams;
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
 * switching is a one-file change. Phase 3 exposes background removal (CUTOUT);
 * erase and upscale are added in Phase 4.
 */
export interface InferenceAdapter {
  readonly provider: string;
  removeBackground(input: CutoutInput): Promise<InferenceResult>;
}
