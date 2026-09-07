import "server-only";
import sharp from "sharp";
import type {
  CutoutInput,
  EraseInput,
  InferenceAdapter,
  InferenceResult,
  UpscaleInput,
} from "./types";

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

/** Separable Chebyshev max-filter — a morphological dilation of a 0/255 mask. */
function dilateMask(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w && mask[row + xx]) {
          m = 255;
          break;
        }
      }
      tmp[row + x] = m;
    }
  }
  const out = new Uint8Array(mask.length);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h && tmp[yy * w + x]) {
          m = 255;
          break;
        }
      }
      out[y * w + x] = m;
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

    async inpaint(input: EraseInput): Promise<InferenceResult> {
      // Decode the input and the mask at the input's exact dimensions.
      const base = sharp(Buffer.from(input.bytes)).ensureAlpha();
      const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
      const px = w * h;

      const maskRaw = await sharp(Buffer.from(input.maskBytes))
        .resize(w, h, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer();
      let mask = new Uint8Array(px);
      for (let p = 0; p < px; p++) mask[p] = maskRaw[p]! > 127 ? 255 : 0;

      // Dilate — painting slightly past the edge avoids halos (Section 8.1).
      mask = dilateMask(mask, w, h, input.params.dilate);

      // Collect masked pixels and their bounding box.
      const masked: number[] = [];
      let minX = w, minY = h, maxX = 0, maxY = 0, meanR = 0, meanG = 0, meanB = 0, nBg = 0;
      const out = Buffer.from(data);
      for (let p = 0; p < px; p++) {
        if (mask[p]) {
          masked.push(p);
          const x = p % w;
          const y = (p - x) / w;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        } else {
          meanR += out[p * 4]!;
          meanG += out[p * 4 + 1]!;
          meanB += out[p * 4 + 2]!;
          nBg++;
        }
      }

      if (masked.length > 0 && nBg > 0) {
        // Seed the hole with the surrounding mean, then diffuse (Gauss–Seidel).
        const sr = Math.round(meanR / nBg);
        const sg = Math.round(meanG / nBg);
        const sb = Math.round(meanB / nBg);
        for (const p of masked) {
          out[p * 4] = sr;
          out[p * 4 + 1] = sg;
          out[p * 4 + 2] = sb;
        }
        const holeDim = Math.max(maxX - minX, maxY - minY) + 1;
        const iterations = Math.min(
          input.params.generativeFill ? 500 : 250,
          Math.max(30, holeDim),
        );
        for (let it = 0; it < iterations; it++) {
          for (const p of masked) {
            const x = p % w;
            const y = (p - x) / w;
            let r = 0, g = 0, b = 0, c = 0;
            if (x > 0) { const i = (p - 1) * 4; r += out[i]!; g += out[i + 1]!; b += out[i + 2]!; c++; }
            if (x < w - 1) { const i = (p + 1) * 4; r += out[i]!; g += out[i + 1]!; b += out[i + 2]!; c++; }
            if (y > 0) { const i = (p - w) * 4; r += out[i]!; g += out[i + 1]!; b += out[i + 2]!; c++; }
            if (y < h - 1) { const i = (p + w) * 4; r += out[i]!; g += out[i + 1]!; b += out[i + 2]!; c++; }
            if (c > 0) {
              const i = p * 4;
              out[i] = Math.round(r / c);
              out[i + 1] = Math.round(g / c);
              out[i + 2] = Math.round(b / c);
            }
          }
        }
      }

      // Only masked pixels changed; untouched pixels are bit-identical.
      const pngBuf = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toBuffer();
      return { bytes: new Uint8Array(pngBuf), contentType: "image/png", width: w, height: h };
    },

    async upscale(input: UpscaleInput): Promise<InferenceResult> {
      const meta = await sharp(Buffer.from(input.bytes)).metadata();
      const sw = meta.width ?? 0;
      const sh = meta.height ?? 0;
      const longEdge = Math.max(sw, sh) || 1;
      const scale = input.targetLongEdge / longEdge;
      const outW = Math.max(1, Math.round(sw * scale));
      const outH = Math.max(1, Math.round(sh * scale));

      let pipe = sharp(Buffer.from(input.bytes)).resize(outW, outH, {
        kernel: "lanczos3",
        fit: "fill",
      });
      if (input.params.denoise > 0) {
        pipe = pipe.median(input.params.denoise > 50 ? 3 : 1);
      }
      if (input.params.sharpen > 0) {
        pipe = pipe.sharpen({ sigma: 0.5 + (input.params.sharpen / 100) * 1.5 });
      }
      const pngBuf = await pipe.png().toBuffer();
      return { bytes: new Uint8Array(pngBuf), contentType: "image/png", width: outW, height: outH };
    },
  };
}
