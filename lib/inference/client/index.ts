"use client";

import type { JobParams } from "@/lib/validation/jobs";
import { clientAIEnabled } from "./env";
import { removeBackgroundInBrowser } from "./background";
import { upscaleInBrowser } from "./upscale";

export { clientAIEnabled } from "./env";

/** Long-edge box the chosen UPLIFT target resamples into (mirrors UPLIFT_TARGETS). */
const TARGET_LONG_EDGE: Record<string, number> = { "1080p": 1920, "2k": 2560, "4k": 3840 };

export interface ClientToolResult {
  blob: Blob;
  width: number;
  height: number;
  /** Label recorded on the job so the origin of the result is auditable. */
  provider: string;
}

/**
 * Run a tool entirely in the browser when a client-side model covers it.
 * Returns the finished full-resolution result, or null to signal "no client
 * model for this — use the server path" (ERASE, colour-composite cutouts, or
 * when client AI is disabled/unsupported). Never throws: any model failure
 * resolves to null so the caller falls back to the server cleanly.
 */
export async function runClientTool(
  params: JobParams,
  input: Blob,
): Promise<ClientToolResult | null> {
  if (!clientAIEnabled()) return null;
  try {
    if (params.tool === "cutout") {
      // The solid-colour composite is a cheap server step; the model path
      // returns transparency, which is the common case.
      if (params.background === "color") return null;
      const r = await removeBackgroundInBrowser(input);
      return { blob: r.blob, width: r.width, height: r.height, provider: "client-wasm:rmbg" };
    }
    if (params.tool === "uplift") {
      const target = TARGET_LONG_EDGE[params.target] ?? 1920;
      const r = await upscaleInBrowser(input, target);
      return { blob: r.blob, width: r.width, height: r.height, provider: "client-wasm:swin2sr" };
    }
    return null; // ERASE → server Telea inpaint
  } catch (err) {
    console.warn("[client-ai] falling back to server:", err);
    return null;
  }
}
