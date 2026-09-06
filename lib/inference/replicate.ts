import "server-only";
import sharp from "sharp";
import type { CutoutInput, InferenceAdapter, InferenceResult } from "./types";

/**
 * Replicate inference adapter (production). Runs a background-removal model via
 * Replicate's HTTP API. The model version is configurable so it can be updated
 * without a code change:
 *   REPLICATE_CUTOUT_VERSION  — the model version hash to run (required to use
 *                               this provider; e.g. a BiRefNet/RMBG model).
 *
 * The prediction runs synchronously here (create → poll) because the job
 * processor is already off the request path. A webhook path is added in the
 * hardening phase.
 */

export interface ReplicateConfig {
  apiToken: string;
  cutoutVersion?: string;
}

const API = "https://api.replicate.com/v1/predictions";
const POLL_MS = 1500;
const MAX_WAIT_MS = 120_000;

interface Prediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
  urls?: { get?: string };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createReplicateInference(cfg: ReplicateConfig): InferenceAdapter {
  const headers = {
    Authorization: `Token ${cfg.apiToken}`,
    "Content-Type": "application/json",
  };

  return {
    provider: "replicate",

    async removeBackground(input: CutoutInput): Promise<InferenceResult> {
      if (!cfg.cutoutVersion) {
        throw new Error(
          "REPLICATE_CUTOUT_VERSION is not set — cannot run background removal on Replicate.",
        );
      }

      const dataUri = `data:${input.contentType};base64,${Buffer.from(input.bytes).toString("base64")}`;

      const createRes = await fetch(API, {
        method: "POST",
        headers,
        body: JSON.stringify({
          version: cfg.cutoutVersion,
          input: { image: dataUri },
        }),
      });
      if (!createRes.ok) {
        throw new Error(`Replicate create failed: ${createRes.status}`);
      }
      let pred = (await createRes.json()) as Prediction;

      const pollUrl = pred.urls?.get ?? `${API}/${pred.id}`;
      const deadline = Date.now() + MAX_WAIT_MS;
      while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled") {
        if (Date.now() > deadline) throw new Error("Replicate prediction timed out");
        await sleep(POLL_MS);
        const poll = await fetch(pollUrl, { headers });
        pred = (await poll.json()) as Prediction;
      }
      if (pred.status !== "succeeded") {
        throw new Error(`Replicate prediction ${pred.status}: ${pred.error ?? "unknown"}`);
      }

      const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
      if (!outputUrl) throw new Error("Replicate returned no output");

      const imgRes = await fetch(outputUrl);
      if (!imgRes.ok) throw new Error(`Failed to fetch Replicate output: ${imgRes.status}`);
      const raw = new Uint8Array(await imgRes.arrayBuffer());

      // Normalise to PNG and read dimensions.
      const png = await sharp(Buffer.from(raw)).png().toBuffer({ resolveWithObject: true });
      return {
        bytes: new Uint8Array(png.data),
        contentType: "image/png",
        width: png.info.width,
        height: png.info.height,
      };
    },
  };
}
