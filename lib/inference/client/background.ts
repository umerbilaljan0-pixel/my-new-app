"use client";

import { MODEL_CDN, IMGLY_VERSION } from "./env";

/**
 * In-browser background removal via @imgly/background-removal (RMBG-1.4, ONNX +
 * WASM). Loaded from a CDN at runtime so it never enters the server bundle.
 * Returns a transparent PNG Blob, or throws — callers fall back to the server.
 */

type ImglyModule = {
  removeBackground: (
    image: Blob | string,
    config?: Record<string, unknown>,
  ) => Promise<Blob>;
};

let modulePromise: Promise<ImglyModule> | null = null;

function loadImgly(): Promise<ImglyModule> {
  if (!modulePromise) {
    const url = `${MODEL_CDN}/@imgly/background-removal@${IMGLY_VERSION}/+esm`;
    modulePromise = import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ url
    ) as Promise<ImglyModule>;
  }
  return modulePromise;
}

export interface ClientBgResult {
  blob: Blob;
  width: number;
  height: number;
}

/** Remove the background in-browser. Resolves to a transparent PNG. */
export async function removeBackgroundInBrowser(input: Blob): Promise<ClientBgResult> {
  const { removeBackground } = await loadImgly();
  const blob = await removeBackground(input, {
    // RMBG-1.4 weights; "medium" balances quality and download size.
    model: "medium",
    output: { format: "image/png", quality: 1 },
  });
  const { width, height } = await dimensionsOf(blob);
  return { blob, width, height };
}

async function dimensionsOf(blob: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(blob);
  const dims = { width: bmp.width, height: bmp.height };
  bmp.close();
  return dims;
}
