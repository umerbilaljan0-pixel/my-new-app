import "server-only";
import sharp from "sharp";
import { MAX_OUTPUT_EDGE } from "@/lib/validation/jobs";
import type {
  CutoutInput,
  EraseInput,
  InferenceAdapter,
  InferenceResult,
  UpscaleInput,
} from "./types";

/**
 * Replicate inference adapter (production). Runs models via Replicate's HTTP API.
 * Model versions are configurable so they can be updated without a code change:
 *   REPLICATE_CUTOUT_VERSION   — background removal (BiRefNet/RMBG-class)
 *   REPLICATE_ERASE_VERSION    — inpainting (LaMa-class)
 *   REPLICATE_UPSCALE_VERSION  — super-resolution (Real-ESRGAN-class)
 *
 * Predictions run synchronously here (create → poll) because the job processor
 * is already off the request path. A webhook path is added in the hardening
 * phase.
 */

export interface ReplicateConfig {
  apiToken: string;
  cutoutVersion?: string;
  eraseVersion?: string;
  upscaleVersion?: string;
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dataUri = (bytes: Uint8Array, type: string) =>
  `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;

async function toPng(raw: Uint8Array): Promise<InferenceResult> {
  const png = await sharp(Buffer.from(raw)).png().toBuffer({ resolveWithObject: true });
  return {
    bytes: new Uint8Array(png.data),
    contentType: "image/png",
    width: png.info.width,
    height: png.info.height,
  };
}

export function createReplicateInference(cfg: ReplicateConfig): InferenceAdapter {
  const headers = {
    Authorization: `Token ${cfg.apiToken}`,
    "Content-Type": "application/json",
  };

  async function runPrediction(
    version: string | undefined,
    envName: string,
    input: Record<string, unknown>,
  ): Promise<Uint8Array> {
    if (!version) throw new Error(`${envName} is not set — cannot run this model on Replicate.`);
    const createRes = await fetch(API, {
      method: "POST",
      headers,
      body: JSON.stringify({ version, input }),
    });
    if (!createRes.ok) throw new Error(`Replicate create failed: ${createRes.status}`);
    let pred = (await createRes.json()) as Prediction;

    const pollUrl = pred.urls?.get ?? `${API}/${pred.id}`;
    const deadline = Date.now() + MAX_WAIT_MS;
    while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled") {
      if (Date.now() > deadline) throw new Error("Replicate prediction timed out");
      await sleep(POLL_MS);
      pred = (await (await fetch(pollUrl, { headers })).json()) as Prediction;
    }
    if (pred.status !== "succeeded") {
      throw new Error(`Replicate prediction ${pred.status}: ${pred.error ?? "unknown"}`);
    }
    const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!outputUrl) throw new Error("Replicate returned no output");
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch Replicate output: ${imgRes.status}`);
    return new Uint8Array(await imgRes.arrayBuffer());
  }

  return {
    provider: "replicate",

    async removeBackground(input: CutoutInput): Promise<InferenceResult> {
      const raw = await runPrediction(cfg.cutoutVersion, "REPLICATE_CUTOUT_VERSION", {
        image: dataUri(input.bytes, input.contentType),
      });
      return toPng(raw);
    },

    async inpaint(input: EraseInput): Promise<InferenceResult> {
      const raw = await runPrediction(cfg.eraseVersion, "REPLICATE_ERASE_VERSION", {
        image: dataUri(input.bytes, input.contentType),
        mask: dataUri(input.maskBytes, "image/png"),
      });
      // Guarantee only masked pixels change: composite the model output onto the
      // original, using the (resized) mask as the output layer's alpha. The mask
      // is fed as genuine raw single-channel data so the join is unambiguous.
      const meta = await sharp(Buffer.from(input.bytes)).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (!w || !h) throw new Error("replicate inpaint: could not read input dimensions");

      const outputRgb = sharp(Buffer.from(raw)).resize(w, h, { fit: "fill" }).removeAlpha();
      const maskAlpha = await sharp(Buffer.from(input.maskBytes))
        .resize(w, h, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer(); // w*h single-channel bytes

      const outputWithAlpha = await outputRgb
        .joinChannel(maskAlpha, { raw: { width: w, height: h, channels: 1 } })
        .png()
        .toBuffer();
      const composed = await sharp(Buffer.from(input.bytes))
        .ensureAlpha()
        .composite([{ input: outputWithAlpha, blend: "over" }])
        .png()
        .toBuffer({ resolveWithObject: true });
      return {
        bytes: new Uint8Array(composed.data),
        contentType: "image/png",
        width: composed.info.width,
        height: composed.info.height,
      };
    },

    async upscale(input: UpscaleInput): Promise<InferenceResult> {
      const meta = await sharp(Buffer.from(input.bytes)).metadata();
      const longEdge = Math.max(meta.width ?? 1, meta.height ?? 1);
      const scale = Math.max(2, Math.min(4, Math.ceil(input.targetLongEdge / longEdge)));
      const raw = await runPrediction(cfg.upscaleVersion, "REPLICATE_UPSCALE_VERSION", {
        image: dataUri(input.bytes, input.contentType),
        scale,
      });
      // Resample the model output to the exact target long edge (Section 8.3).
      const sw = meta.width ?? 1;
      const sh = meta.height ?? 1;
      const targetLong = Math.min(input.targetLongEdge, MAX_OUTPUT_EDGE);
      const outScale = targetLong / longEdge;
      const outW = Math.max(1, Math.min(MAX_OUTPUT_EDGE, Math.round(sw * outScale)));
      const outH = Math.max(1, Math.min(MAX_OUTPUT_EDGE, Math.round(sh * outScale)));
      let pipe = sharp(Buffer.from(raw), { limitInputPixels: false }).resize(outW, outH, { kernel: "lanczos3", fit: "fill" });
      // The model already reconstructs detail; add a light unsharp + mild local
      // contrast so the resampled result stays crisp at 4K/8K.
      const extra = input.params.sharpen / 100;
      pipe = pipe
        .sharpen({ sigma: 0.6 + extra * 0.8, m1: 0.5, m2: 1.8 + extra * 1.2 })
        .sharpen({ sigma: 2.2, m1: 0.45, m2: 0 }); // CAS-like local clarity (fast, colour-safe)
      const png = await pipe.png({ compressionLevel: 6 }).toBuffer({ resolveWithObject: true });
      return {
        bytes: new Uint8Array(png.data),
        contentType: "image/png",
        width: png.info.width,
        height: png.info.height,
      };
    },
  };
}
