import "server-only";
import sharp from "sharp";
import type { CutoutInput, InferenceAdapter, InferenceResult } from "./types";

/**
 * Local background-removal adapter — the no-credential dev/self-host fallback
 * (spec rule #1: a real working fallback, not a mock). It runs a genuine
 * algorithm: estimate the background colour from the border, flood-fill the
 * connected background region inward (a "magic wand from the edges"), and build
 * an alpha channel from that mask with an optional feather.
 *
 * This is high quality on the uniform backgrounds CLEANPLATE's core users have
 * (e-commerce product shots on white/grey). The production adapter (Replicate,
 * a BiRefNet/RMBG-class model) handles arbitrary scenes and hair/fur; both sit
 * behind the same interface.
 */

function colorDist2(
  data: Buffer,
  i: number,
  r: number,
  g: number,
  b: number,
): number {
  const dr = data[i]! - r;
  const dg = data[i + 1]! - g;
  const db = data[i + 2]! - b;
  return dr * dr + dg * dg + db * db;
}

/** Separable box blur of a single-channel Uint8 array, radius r. */
function blurAlpha(alpha: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return alpha;
  const tmp = new Uint8Array(alpha.length);
  const out = new Uint8Array(alpha.length);
  const win = r * 2 + 1;
  // Horizontal pass.
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) sum += alpha[row + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[row + x] = Math.round(sum / win);
      const add = row + Math.min(w - 1, x + r + 1);
      const sub = row + Math.max(0, x - r);
      sum += alpha[add]! - alpha[sub]!;
    }
  }
  // Vertical pass.
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(sum / win);
      const add = Math.min(h - 1, y + r + 1) * w + x;
      const sub = Math.max(0, y - r) * w + x;
      sum += tmp[add]! - tmp[sub]!;
    }
  }
  return out;
}

export function createLocalInference(): InferenceAdapter {
  return {
    provider: "local",

    async removeBackground(input: CutoutInput): Promise<InferenceResult> {
      const img = sharp(Buffer.from(input.bytes)).ensureAlpha();
      const { data, info } = await img
        .raw()
        .toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
      const px = w * h;

      // 1. Estimate background colour from the 1px border.
      let br = 0, bg = 0, bb = 0, n = 0;
      const sample = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        br += data[i]!;
        bg += data[i + 1]!;
        bb += data[i + 2]!;
        n++;
      };
      for (let x = 0; x < w; x++) {
        sample(x, 0);
        sample(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        sample(0, y);
        sample(w - 1, y);
      }
      br = Math.round(br / n);
      bg = Math.round(bg / n);
      bb = Math.round(bb / n);

      // 2. Flood fill the connected background from every border pixel.
      const tol2 = 44 * 44; // squared colour tolerance
      const isBg = new Uint8Array(px);
      const stack: number[] = [];
      const pushIfBg = (x: number, y: number) => {
        const p = y * w + x;
        if (isBg[p]) return;
        if (colorDist2(data, p * 4, br, bg, bb) <= tol2) {
          isBg[p] = 1;
          stack.push(p);
        }
      };
      for (let x = 0; x < w; x++) {
        pushIfBg(x, 0);
        pushIfBg(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        pushIfBg(0, y);
        pushIfBg(w - 1, y);
      }
      while (stack.length) {
        const p = stack.pop()!;
        const x = p % w;
        const y = (p - x) / w;
        if (x > 0) pushIfBg(x - 1, y);
        if (x < w - 1) pushIfBg(x + 1, y);
        if (y > 0) pushIfBg(x, y - 1);
        if (y < h - 1) pushIfBg(x, y + 1);
      }

      // 3. Alpha from mask, feathered.
      let alpha = new Uint8Array(px);
      for (let p = 0; p < px; p++) alpha[p] = isBg[p] ? 0 : 255;
      alpha = blurAlpha(alpha, w, h, input.params.feather);

      // 4. Compose: transparent (default) or over a solid colour.
      const out = Buffer.from(data); // RGBA copy
      if (input.params.background === "color" && input.params.color) {
        const hex = input.params.color.replace("#", "");
        const cr = parseInt(hex.slice(0, 2), 16);
        const cg = parseInt(hex.slice(2, 4), 16);
        const cb = parseInt(hex.slice(4, 6), 16);
        for (let p = 0; p < px; p++) {
          const a = alpha[p]! / 255;
          const i = p * 4;
          out[i] = Math.round(out[i]! * a + cr * (1 - a));
          out[i + 1] = Math.round(out[i + 1]! * a + cg * (1 - a));
          out[i + 2] = Math.round(out[i + 2]! * a + cb * (1 - a));
          out[i + 3] = 255;
        }
      } else {
        for (let p = 0; p < px; p++) out[p * 4 + 3] = alpha[p]!;
      }

      const pngBuf = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toBuffer();

      return {
        bytes: new Uint8Array(pngBuf),
        contentType: "image/png",
        width: w,
        height: h,
      };
    },
  };
}
