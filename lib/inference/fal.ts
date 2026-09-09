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
 * Fal.ai inference adapter (production). Runs real neural models via fal.ai's
 * synchronous REST endpoint. Model slugs are configurable so they can be
 * updated without a code change; the defaults target well-known public models:
 *   FAL_CUTOUT_MODEL   — background removal (default: fal-ai/imageutils/rembg, RMBG)
 *   FAL_ERASE_MODEL    — inpainting (default: fal-ai/lama, LaMa)
 *   FAL_UPSCALE_MODEL  — super-resolution (default: fal-ai/esrgan, Real-ESRGAN)
 *
 * The job processor is already off the request path, so we call fal's sync API
 * (fal.run/<model>) and read the image back from the returned URL. Outputs are
 * normalised to PNG and, for ERASE, composited so only masked pixels change.
 */

export interface FalConfig {
  apiKey: string;
  cutoutModel?: string;
  eraseModel?: string;
  upscaleModel?: string;
}

const BASE = "https://fal.run";
const DEFAULT_CUTOUT = "fal-ai/imageutils/rembg";
const DEFAULT_ERASE = "fal-ai/lama";
const DEFAULT_UPSCALE = "fal-ai/esrgan";

const dataUri = (bytes: Uint8Array, type: string) =>
  `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;

/** Pull the first image URL out of fal's varied response shapes. */
function extractImageUrl(json: unknown): string | null {
  const j = json as Record<string, unknown>;
  const img = j?.image as { url?: string } | undefined;
  if (img?.url) return img.url;
  const images = j?.images as Array<{ url?: string }> | undefined;
  if (Array.isArray(images) && images[0]?.url) return images[0]!.url!;
  const out = j?.output as { url?: string } | string | undefined;
  if (typeof out === "string") return out;
  if (out?.url) return out.url;
  return null;
}

export function createFalInference(cfg: FalConfig): InferenceAdapter {
  const headers = {
    Authorization: `Key ${cfg.apiKey}`,
    "Content-Type": "application/json",
  };

  async function run(model: string, input: Record<string, unknown>): Promise<Uint8Array> {
    const res = await fetch(`${BASE}/${model}`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`fal.ai ${model} failed: ${res.status} ${detail.slice(0, 200)}`);
    }
    const json = await res.json();
    const url = extractImageUrl(json);
    if (!url) throw new Error(`fal.ai ${model} returned no image`);
    // A data: URI is returned inline by some models; otherwise fetch the URL.
    if (url.startsWith("data:")) {
      const b64 = url.slice(url.indexOf(",") + 1);
      return new Uint8Array(Buffer.from(b64, "base64"));
    }
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`fal.ai output fetch failed: ${imgRes.status}`);
    return new Uint8Array(await imgRes.arrayBuffer());
  }

  return {
    provider: "fal",

    async removeBackground(input: CutoutInput): Promise<InferenceResult> {
      const raw = await run(cfg.cutoutModel ?? DEFAULT_CUTOUT, {
        image_url: dataUri(input.bytes, input.contentType),
      });
      // Models may return RGB on a flat background or RGBA; ensure alpha.
      const png = await sharp(Buffer.from(raw)).ensureAlpha().png().toBuffer({ resolveWithObject: true });
      return { bytes: new Uint8Array(png.data), contentType: "image/png", width: png.info.width, height: png.info.height };
    },

    async inpaint(input: EraseInput): Promise<InferenceResult> {
      const raw = await run(cfg.eraseModel ?? DEFAULT_ERASE, {
        image_url: dataUri(input.bytes, input.contentType),
        mask_url: dataUri(input.maskBytes, "image/png"),
      });
      // Guarantee only masked pixels change: composite the model output back
      // onto the original through the (resized) mask as alpha.
      const meta = await sharp(Buffer.from(input.bytes)).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (!w || !h) throw new Error("fal inpaint: could not read input dimensions");
      const outputRgb = sharp(Buffer.from(raw)).resize(w, h, { fit: "fill" }).removeAlpha();
      const maskAlpha = await sharp(Buffer.from(input.maskBytes))
        .resize(w, h, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer();
      const outputWithAlpha = await outputRgb
        .joinChannel(maskAlpha, { raw: { width: w, height: h, channels: 1 } })
        .png()
        .toBuffer();
      const composed = await sharp(Buffer.from(input.bytes))
        .ensureAlpha()
        .composite([{ input: outputWithAlpha, blend: "over" }])
        .png()
        .toBuffer({ resolveWithObject: true });
      return { bytes: new Uint8Array(composed.data), contentType: "image/png", width: composed.info.width, height: composed.info.height };
    },

    async upscale(input: UpscaleInput): Promise<InferenceResult> {
      const meta = await sharp(Buffer.from(input.bytes)).metadata();
      const sw = meta.width ?? 1;
      const sh = meta.height ?? 1;
      const longEdge = Math.max(sw, sh);
      const scale = Math.max(2, Math.min(4, Math.ceil(input.targetLongEdge / longEdge)));
      const raw = await run(cfg.upscaleModel ?? DEFAULT_UPSCALE, {
        image_url: dataUri(input.bytes, input.contentType),
        scale,
      });
      // Resample the model output to the exact requested long edge (Section 8.3),
      // clamped to the 8192px ceiling, then a light sharpen + local contrast.
      const targetLong = Math.min(input.targetLongEdge, MAX_OUTPUT_EDGE);
      const outScale = targetLong / longEdge;
      const outW = Math.max(1, Math.min(MAX_OUTPUT_EDGE, Math.round(sw * outScale)));
      const outH = Math.max(1, Math.min(MAX_OUTPUT_EDGE, Math.round(sh * outScale)));
      let pipe = sharp(Buffer.from(raw), { limitInputPixels: false }).resize(outW, outH, { kernel: "lanczos3", fit: "fill" });
      const extra = input.params.sharpen / 100;
      pipe = pipe
        .sharpen({ sigma: 0.6 + extra * 0.8, m1: 0.5, m2: 1.8 + extra * 1.2 })
        .sharpen({ sigma: 2.2, m1: 0.45, m2: 0 }); // CAS-like local clarity (fast, colour-safe)
      const png = await pipe.png({ compressionLevel: 6 }).toBuffer({ resolveWithObject: true });
      return { bytes: new Uint8Array(png.data), contentType: "image/png", width: png.info.width, height: png.info.height };
    },
  };
}
