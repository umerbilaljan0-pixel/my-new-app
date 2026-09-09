"use client";

import { MODEL_CDN, TRANSFORMERS_VERSION } from "./env";

/**
 * In-browser super-resolution via transformers.js (Swin2SR x2, ONNX + WASM).
 * Loaded from a CDN at runtime. The model doubles resolution; we then resample
 * to the exact requested long edge (preserving aspect) so the output matches
 * the chosen target (1080p / 2K / 4K). Returns a PNG Blob or throws — callers
 * fall back to the server upscaler.
 *
 * Swin2SR is memory-heavy, so the input fed to the model is capped; the final
 * size is reached by a high-quality canvas resample of the model output.
 */

const SWIN2SR_MODEL = "Xenova/swin2SR-classical-sr-x2-64";
/** Cap the model input long edge (keeps in-browser memory/time sane). */
const MODEL_INPUT_CAP = 1024;

/* eslint-disable @typescript-eslint/no-explicit-any */
type TransformersModule = {
  pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<any>;
  env: Record<string, any>;
  RawImage: any;
};

let modulePromise: Promise<TransformersModule> | null = null;
let pipePromise: Promise<any> | null = null;

function loadTransformers(): Promise<TransformersModule> {
  if (!modulePromise) {
    const url = `${MODEL_CDN}/@huggingface/transformers@${TRANSFORMERS_VERSION}`;
    modulePromise = (
      import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as Promise<TransformersModule>
    ).then((mod) => {
      // Let the library fetch weights from the HF hub CDN.
      if (mod.env) {
        mod.env.allowLocalModels = false;
        if (mod.env.backends?.onnx?.wasm) mod.env.backends.onnx.wasm.proxy = true;
      }
      return mod;
    });
  }
  return modulePromise;
}

async function getPipeline(): Promise<any> {
  if (!pipePromise) {
    pipePromise = loadTransformers().then(({ pipeline }) =>
      pipeline("image-to-image", SWIN2SR_MODEL),
    );
  }
  return pipePromise;
}

/** Downscale a blob so its long edge is <= cap (keeps the model tractable). */
async function capInput(input: Blob, cap: number): Promise<Blob> {
  const bmp = await createImageBitmap(input);
  const long = Math.max(bmp.width, bmp.height);
  if (long <= cap) {
    bmp.close();
    return input;
  }
  const s = cap / long;
  const w = Math.max(1, Math.round(bmp.width * s));
  const h = Math.max(1, Math.round(bmp.height * s));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.convertToBlob({ type: "image/png" });
}

/** Resample a bitmap source to an exact target long edge, aspect preserved. */
async function resampleToLongEdge(
  source: ImageBitmap,
  targetLongEdge: number,
): Promise<Blob> {
  const long = Math.max(source.width, source.height);
  const s = targetLongEdge / long;
  const w = Math.max(1, Math.round(source.width * s));
  const h = Math.max(1, Math.round(source.height * s));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.convertToBlob({ type: "image/png" });
}

export interface ClientUpscaleResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function upscaleInBrowser(
  input: Blob,
  targetLongEdge: number,
): Promise<ClientUpscaleResult> {
  const { RawImage } = await loadTransformers();
  const upscaler = await getPipeline();

  const capped = await capInput(input, MODEL_INPUT_CAP);
  const url = URL.createObjectURL(capped);
  try {
    const image = await RawImage.fromURL(url);
    const output = await upscaler(image); // Swin2SR x2 → RawImage

    // RawImage → ImageBitmap (via its own blob if available, else canvas).
    let bmp: ImageBitmap;
    if (typeof output.toBlob === "function") {
      bmp = await createImageBitmap(await output.toBlob());
    } else {
      const rgba = toRgba(output);
      const id = new ImageData(rgba, output.width, output.height);
      const tmp = new OffscreenCanvas(output.width, output.height);
      tmp.getContext("2d")!.putImageData(id, 0, 0);
      bmp = await createImageBitmap(tmp);
    }

    const blob = await resampleToLongEdge(bmp, targetLongEdge);
    bmp.close();
    const dims = await dimensionsOf(blob);
    return { blob, width: dims.width, height: dims.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Coerce a transformers.js RawImage (1/3/4 channels) to RGBA bytes. */
function toRgba(img: { data: Uint8ClampedArray | Uint8Array; width: number; height: number; channels: number }): Uint8ClampedArray {
  const { data, width, height, channels } = img;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const s = p * channels;
    const d = p * 4;
    if (channels === 1) {
      out[d] = out[d + 1] = out[d + 2] = data[s]!;
      out[d + 3] = 255;
    } else if (channels === 3) {
      out[d] = data[s]!; out[d + 1] = data[s + 1]!; out[d + 2] = data[s + 2]!; out[d + 3] = 255;
    } else {
      out[d] = data[s]!; out[d + 1] = data[s + 1]!; out[d + 2] = data[s + 2]!; out[d + 3] = data[s + 3]!;
    }
  }
  return out;
}

async function dimensionsOf(blob: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(blob);
  const dims = { width: bmp.width, height: bmp.height };
  bmp.close();
  return dims;
}
