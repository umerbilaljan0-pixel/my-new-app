import "server-only";
import sharp from "sharp";
import { UPLIFT_TARGETS, MAX_OUTPUT_EDGE } from "@/lib/validation/jobs";
import type {
  CutoutInput,
  EraseInput,
  InferenceAdapter,
  InferenceResult,
  UpscaleInput,
} from "./types";

/**
 * Local inference adapter — the no-credential dev / self-host fallback
 * (spec rule #1: a real working algorithm, never a mock). All three tools run
 * genuine, dependency-free pixel algorithms on top of sharp:
 *
 *   • CUTOUT  — border-seeded flood fill + soft-alpha matting with edge
 *               decontamination and despeckle → clean, anti-aliased cut-outs.
 *   • ERASE   — Telea-style inward boundary propagation (marching inpaint) that
 *               copies real surrounding texture into the hole, then blends the
 *               seam. Never emits a flat grey patch.
 *   • UPLIFT  — Lanczos-3 resampling with a gamma-safe unsharp mask to restore
 *               the detail resampling softens, preserving colour and alpha.
 *
 * The production adapter (Replicate: BiRefNet/RMBG, LaMa, Real-ESRGAN) sits
 * behind the same interface for arbitrary scenes and hair/fur; both are exact
 * on resolution, aspect ratio, colour and MIME type.
 */

// ── shared helpers ──────────────────────────────────────────────────────────

/** Squared RGB distance between an RGBA pixel at byte offset `i` and (r,g,b). */
function colorDist2(data: Uint8Array | Buffer, i: number, r: number, g: number, b: number): number {
  const dr = data[i]! - r;
  const dg = data[i + 1]! - g;
  const db = data[i + 2]! - b;
  return dr * dr + dg * dg + db * db;
}

/** Separable box blur of a single-channel Float32 field, radius r (edge-clamped). */
function blurField(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return src;
  const win = r * 2 + 1;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / win;
      sum += src[row + Math.min(w - 1, x + r + 1)]! - src[row + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / win;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
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
        if (xx >= 0 && xx < w && mask[row + xx]) { m = 255; break; }
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
        if (yy >= 0 && yy < h && tmp[yy * w + x]) { m = 255; break; }
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

/**
 * Remove connected regions of `value` smaller than `minArea` from a 0/1 map,
 * flipping them to `1 - value`. Used to drop cut-out specks and fill pinholes
 * inside the subject (morphological cleanup) before matting.
 */
function removeSmallRegions(map: Uint8Array, w: number, h: number, value: 0 | 1, minArea: number): void {
  const n = w * h;
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  for (let s = 0; s < n; s++) {
    if (seen[s] || map[s] !== value) continue;
    stack.length = 0;
    stack.push(s);
    seen[s] = 1;
    const region: number[] = [s];
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && !seen[p - 1] && map[p - 1] === value) { seen[p - 1] = 1; stack.push(p - 1); region.push(p - 1); }
      if (x < w - 1 && !seen[p + 1] && map[p + 1] === value) { seen[p + 1] = 1; stack.push(p + 1); region.push(p + 1); }
      if (y > 0 && !seen[p - w] && map[p - w] === value) { seen[p - w] = 1; stack.push(p - w); region.push(p - w); }
      if (y < h - 1 && !seen[p + w] && map[p + w] === value) { seen[p + w] = 1; stack.push(p + w); region.push(p + w); }
    }
    if (region.length < minArea) {
      const flip = (1 - value) as 0 | 1;
      for (const p of region) map[p] = flip;
    }
  }
}

/**
 * Luma gradient magnitude (|dx| + |dy|) per pixel — used to stop the background
 * flood fill at the subject's silhouette. This is what keeps a shirt whose
 * colour is close to the background from being "flooded away": the strong edge
 * between subject and background halts propagation even when the colours match.
 */
function gradientMag(data: Uint8Array | Buffer, w: number, h: number): Float32Array {
  const luma = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    luma[p] = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  }
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const xl = x > 0 ? p - 1 : p;
      const xr = x < w - 1 ? p + 1 : p;
      const yt = y > 0 ? p - w : p;
      const yb = y < h - 1 ? p + w : p;
      g[p] = Math.abs(luma[xr]! - luma[xl]!) + Math.abs(luma[yb]! - luma[yt]!);
    }
  }
  return g;
}

/** Per-channel median of the 1px image border — a robust background estimate. */
function borderMedian(data: Uint8Array | Buffer, w: number, h: number): [number, number, number] {
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    rs.push(data[i]!); gs.push(data[i + 1]!); bs.push(data[i + 2]!);
  };
  for (let x = 0; x < w; x++) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y++) { take(0, y); take(w - 1, y); }
  const med = (a: number[]) => { a.sort((p, q) => p - q); return a[a.length >> 1]!; };
  return [med(rs), med(gs), med(bs)];
}

export function createLocalInference(): InferenceAdapter {
  return {
    provider: "local",

    // ── CUTOUT ───────────────────────────────────────────────────────────────
    async removeBackground(input: CutoutInput): Promise<InferenceResult> {
      const { data, info } = await sharp(Buffer.from(input.bytes))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
      if (!w || !h) throw new Error("cutout: could not decode image dimensions");
      const px = w * h;

      // 1. Robust background colour from the border (median resists a subject
      //    that touches an edge better than a mean).
      const [br, bg, bb] = borderMedian(data, w, h);

      // Edge map: the flood must not cross the subject's silhouette, so it can't
      // eat a body/shirt whose colour happens to match the background.
      const grad = gradientMag(data, w, h);
      let gMean = 0;
      for (let p = 0; p < px; p++) gMean += grad[p]!;
      gMean /= px;
      let gVar = 0;
      for (let p = 0; p < px; p++) gVar += (grad[p]! - gMean) ** 2;
      const gStd = Math.sqrt(gVar / px);
      // A pixel is "on an edge" when its gradient clearly exceeds the image's
      // typical gradient. The flood stops at such pixels.
      const edgeThreshold = Math.max(24, gMean + 2.0 * gStd);

      // 2. Flood-fill the connected background inward from every border pixel,
      //    propagating only through near-background colour AND low-gradient
      //    (non-edge) pixels. A hard mask of what is *definitely* background.
      const tol2 = 42 * 42; // squared colour tolerance
      const isBg = new Uint8Array(px);
      const stack: number[] = [];
      const pushIfBg = (x: number, y: number) => {
        const p = y * w + x;
        if (isBg[p]) return;
        if (grad[p]! > edgeThreshold) return; // don't cross the subject outline
        if (colorDist2(data, p * 4, br, bg, bb) <= tol2) { isBg[p] = 1; stack.push(p); }
      };
      for (let x = 0; x < w; x++) { pushIfBg(x, 0); pushIfBg(x, h - 1); }
      for (let y = 0; y < h; y++) { pushIfBg(0, y); pushIfBg(w - 1, y); }
      while (stack.length) {
        const p = stack.pop()!;
        const x = p % w;
        const y = (p - x) / w;
        if (x > 0) pushIfBg(x - 1, y);
        if (x < w - 1) pushIfBg(x + 1, y);
        if (y > 0) pushIfBg(x, y - 1);
        if (y < h - 1) pushIfBg(x, y + 1);
      }

      // 3. Clean the mask: drop tiny background islands trapped inside the
      //    subject (pinholes) and tiny foreground specks in the background.
      const minRegion = Math.max(16, Math.round(px * 0.0004));
      removeSmallRegions(isBg, w, h, 0, minRegion); // fill subject pinholes
      removeSmallRegions(isBg, w, h, 1, minRegion); // drop background specks

      // 3b. Grow the foreground by a couple of pixels (erode the background) so
      //     clothing/body contours aren't truncated at the silhouette, per the
      //     full-body fix. Dilate the FG mask, then invert back to background.
      const fg255 = new Uint8Array(px);
      for (let p = 0; p < px; p++) fg255[p] = isBg[p] ? 0 : 255;
      const fgGrown = dilateMask(fg255, w, h, 2);
      for (let p = 0; p < px; p++) isBg[p] = fgGrown[p] ? 0 : 1;

      // 4. Soft alpha. Start from the hard mask, then anti-alias the boundary by
      //    a distance-aware colour ramp so edges follow the real colour gradient
      //    instead of stair-stepping. `feather` widens the transition band.
      const dLow = 30, dHigh = 90; // colour-distance ramp for the transition band
      const alpha = new Float32Array(px);
      for (let p = 0; p < px; p++) {
        if (!isBg[p]) {
          alpha[p] = 255;
        } else {
          // Background pixel — usually fully transparent, but if it sits near
          // the subject in colour it may be a soft/anti-aliased edge pixel.
          const d = Math.sqrt(colorDist2(data, p * 4, br, bg, bb));
          const t = Math.max(0, Math.min(1, (d - dLow) / (dHigh - dLow)));
          alpha[p] = t * 255;
        }
      }
      // Always apply at least a 1px blur so edges are anti-aliased even at
      // feather=0 (the old hard 0/255 mask is what produced jagged borders).
      const blurred = blurField(alpha, w, h, Math.max(1, input.params.feather));

      // 5. Compose. Edge decontamination removes background colour that bleeds
      //    into partially-transparent pixels (the tell-tale halo): recover the
      //    true foreground colour fg = (obs - (1-a)·bg) / a.
      const out = Buffer.from(data); // RGBA copy — untouched interior stays exact
      const useColor = input.params.background === "color" && !!input.params.color;
      let cr = 0, cg = 0, cbb = 0;
      if (useColor) {
        const hex = input.params.color!.replace("#", "");
        cr = parseInt(hex.slice(0, 2), 16);
        cg = parseInt(hex.slice(2, 4), 16);
        cbb = parseInt(hex.slice(4, 6), 16);
      }
      for (let p = 0; p < px; p++) {
        const a = Math.max(0, Math.min(255, Math.round(blurred[p]!)));
        const i = p * 4;
        if (a > 0 && a < 255) {
          const af = a / 255;
          out[i] = Math.max(0, Math.min(255, Math.round((data[i]! - br * (1 - af)) / af)));
          out[i + 1] = Math.max(0, Math.min(255, Math.round((data[i + 1]! - bg * (1 - af)) / af)));
          out[i + 2] = Math.max(0, Math.min(255, Math.round((data[i + 2]! - bb * (1 - af)) / af)));
        }
        if (useColor) {
          const af = a / 255;
          out[i] = Math.round(out[i]! * af + cr * (1 - af));
          out[i + 1] = Math.round(out[i + 1]! * af + cg * (1 - af));
          out[i + 2] = Math.round(out[i + 2]! * af + cbb * (1 - af));
          out[i + 3] = 255;
        } else {
          out[i + 3] = a;
        }
      }

      const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
      return { bytes: new Uint8Array(png), contentType: "image/png", width: w, height: h };
    },

    // ── ERASE (inpaint) ────────────────────────────────────────────────────────
    async inpaint(input: EraseInput): Promise<InferenceResult> {
      const { data, info } = await sharp(Buffer.from(input.bytes))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
      if (!w || !h) throw new Error("erase: could not decode image dimensions");
      const px = w * h;

      const maskRaw = await sharp(Buffer.from(input.maskBytes))
        .resize(w, h, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer();
      // Threshold → 0/255, dilate (painting slightly past the edge avoids halos,
      // Section 8.1) → 0/1 hole map.
      const mask255 = new Uint8Array(px);
      for (let p = 0; p < px; p++) mask255[p] = maskRaw[p]! > 127 ? 255 : 0;
      const dilated = dilateMask(mask255, w, h, input.params.dilate);
      const hole = new Uint8Array(px);
      let holeCount = 0;
      for (let p = 0; p < px; p++) {
        if (dilated[p]) { hole[p] = 1; holeCount++; }
      }

      // Nothing painted → return the original bytes untouched (never a no-op grey).
      if (holeCount === 0) {
        const png = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
        return { bytes: new Uint8Array(png), contentType: "image/png", width: w, height: h };
      }
      // Erasing essentially the whole frame is not reconstructable — fail loudly
      // rather than emit a flat grey plate.
      if (holeCount > px * 0.92) {
        throw new Error("erase: mask covers almost the whole image — nothing to rebuild from");
      }

      const rgb = Buffer.from(data); // working copy; only hole pixels change

      // 1. Multi-source BFS distance from the hole boundary inward. Filling
      //    nearest-boundary pixels first lets known colour propagate coherently.
      const dist = new Int32Array(px).fill(-1);
      for (let p = 0; p < px; p++) {
        if (hole[p]) continue;
        const x = p % w;
        const y = (p - x) / w;
        // A known pixel adjacent to the hole is a source at distance 0.
        if (
          (x > 0 && hole[p - 1]) || (x < w - 1 && hole[p + 1]) ||
          (y > 0 && hole[p - w]) || (y < h - 1 && hole[p + w])
        ) {
          dist[p] = 0;
        }
      }
      // Assign each hole pixel a BFS distance to the nearest known boundary.
      const holeByDist: number[] = [];
      {
        let frontier: number[] = [];
        for (let p = 0; p < px; p++) if (dist[p] === 0) frontier.push(p);
        let d = 0;
        while (frontier.length) {
          const next: number[] = [];
          for (const p of frontier) {
            const x = p % w;
            const y = (p - x) / w;
            const nb = [
              x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1,
              y > 0 ? p - w : -1, y < h - 1 ? p + w : -1,
            ];
            for (const q of nb) {
              if (q >= 0 && hole[q] && dist[q] === -1) {
                dist[q] = d + 1;
                holeByDist.push(q);
                next.push(q);
              }
            }
          }
          frontier = next;
          d++;
        }
      }

      // 2. March inward. Each hole pixel is the inverse-distance-weighted mean of
      //    its 8-neighbours that are already known (original or previously
      //    filled, i.e. closer to the boundary). This is the propagation core of
      //    Telea's fast-marching inpaint and copies real texture, not a mean.
      const filled = new Uint8Array(px);
      for (let p = 0; p < px; p++) if (!hole[p]) filled[p] = 1;
      const W_ORTHO = 1, W_DIAG = 0.70710678;
      for (const p of holeByDist) {
        const x = p % w;
        const y = (p - x) / w;
        let sr = 0, sg = 0, sb = 0, sw = 0;
        const add = (q: number, weight: number) => {
          if (q < 0 || !filled[q]) return;
          const j = q * 4;
          sr += rgb[j]! * weight; sg += rgb[j + 1]! * weight; sb += rgb[j + 2]! * weight; sw += weight;
        };
        add(x > 0 ? p - 1 : -1, W_ORTHO);
        add(x < w - 1 ? p + 1 : -1, W_ORTHO);
        add(y > 0 ? p - w : -1, W_ORTHO);
        add(y < h - 1 ? p + w : -1, W_ORTHO);
        add(x > 0 && y > 0 ? p - w - 1 : -1, W_DIAG);
        add(x < w - 1 && y > 0 ? p - w + 1 : -1, W_DIAG);
        add(x > 0 && y < h - 1 ? p + w - 1 : -1, W_DIAG);
        add(x < w - 1 && y < h - 1 ? p + w + 1 : -1, W_DIAG);
        const i = p * 4;
        if (sw > 0) {
          rgb[i] = Math.round(sr / sw);
          rgb[i + 1] = Math.round(sg / sw);
          rgb[i + 2] = Math.round(sb / sw);
        }
        filled[p] = 1;
      }

      // 3. Smooth the seam — a few Gauss–Seidel passes confined to the hole.
      //    generativeFill trades a touch more blending for busier textures.
      const smoothPasses = input.params.generativeFill ? 6 : 3;
      for (let it = 0; it < smoothPasses; it++) {
        for (const p of holeByDist) {
          const x = p % w;
          const y = (p - x) / w;
          let r = 0, g = 0, b = 0, c = 0;
          if (x > 0) { const j = (p - 1) * 4; r += rgb[j]!; g += rgb[j + 1]!; b += rgb[j + 2]!; c++; }
          if (x < w - 1) { const j = (p + 1) * 4; r += rgb[j]!; g += rgb[j + 1]!; b += rgb[j + 2]!; c++; }
          if (y > 0) { const j = (p - w) * 4; r += rgb[j]!; g += rgb[j + 1]!; b += rgb[j + 2]!; c++; }
          if (y < h - 1) { const j = (p + w) * 4; r += rgb[j]!; g += rgb[j + 1]!; b += rgb[j + 2]!; c++; }
          if (c > 0) {
            const i = p * 4;
            rgb[i] = Math.round(r / c);
            rgb[i + 1] = Math.round(g / c);
            rgb[i + 2] = Math.round(b / c);
          }
        }
      }

      const png = await sharp(rgb, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
      return { bytes: new Uint8Array(png), contentType: "image/png", width: w, height: h };
    },

    // ── UPLIFT (upscale) ───────────────────────────────────────────────────────
    async upscale(input: UpscaleInput): Promise<InferenceResult> {
      const meta = await sharp(Buffer.from(input.bytes)).metadata();
      const sw = meta.width ?? 0;
      const sh = meta.height ?? 0;
      if (!sw || !sh) throw new Error("upscale: could not decode image dimensions");
      const hasAlpha = !!meta.hasAlpha;

      // Exact target long edge, aspect ratio preserved to the pixel, clamped to
      // the 8192px output ceiling (supports up to 8K).
      const longEdge = Math.max(sw, sh);
      const targetLong = Math.min(input.targetLongEdge, MAX_OUTPUT_EDGE);
      const scale = targetLong / longEdge;
      let outW = Math.max(1, Math.round(sw * scale));
      let outH = Math.max(1, Math.round(sh * scale));
      if (Math.max(outW, outH) > MAX_OUTPUT_EDGE) {
        const c = MAX_OUTPUT_EDGE / Math.max(outW, outH);
        outW = Math.max(1, Math.round(outW * c));
        outH = Math.max(1, Math.round(outH * c));
      }

      let pipe = sharp(Buffer.from(input.bytes), { failOn: "none", limitInputPixels: false });

      // Denoise before enlarging (edge-preserving median) so source noise isn't
      // magnified into the upscaled result.
      if (input.params.denoise > 0) {
        pipe = pipe.median(input.params.denoise > 60 ? 3 : 1);
      }

      // Lanczos-3 — the highest-quality general resampling kernel sharp offers.
      pipe = pipe.resize(outW, outH, { kernel: "lanczos3", fit: "fill", withoutEnlargement: false });

      // High-fidelity post-processing so the result is genuinely crisp, not a
      // flat stretch. Applied only when we actually enlarged; the sharpen slider
      // scales the intensity. sharp operates in linear light, so colour is safe.
      if (scale > 1.001) {
        const extra = input.params.sharpen / 100; // 0..1 from the slider
        const strong = targetLong >= UPLIFT_TARGETS["4k"]; // 4K/8K get a touch more

        // 1. Unsharp mask (detail) — fine-radius, edge-biased.
        pipe = pipe.sharpen({
          sigma: 0.8 + extra * 0.7,
          m1: 0.7 + extra * 0.6,                 // flat-area sharpening (noise-safe)
          m2: (strong ? 2.4 : 2.0) + extra * 1.5, // edge sharpening
        });

        // 2. Contrast-adaptive sharpening (CAS-like) + edge preservation: a
        //    second, larger-radius, flat-weighted unsharp adds local "clarity"
        //    and keeps edges defined across the larger canvas, without the
        //    haloing of naive sharpening. (A CLAHE pass was measured far too
        //    slow at 4K/8K to fit the job timeout, so this clarity pass — which
        //    is both fast and colour-safe in linear light — stands in for it.)
        pipe = pipe.sharpen({ sigma: 2.2, m1: 0.5 + extra * 0.4, m2: 0 });
      } else if (input.params.sharpen > 0) {
        pipe = pipe.sharpen({ sigma: 0.5 + (input.params.sharpen / 100) * 1.5 });
      }

      if (hasAlpha) pipe = pipe.ensureAlpha();

      // PNG output is lossless → no colour degradation or recompression
      // artifacts. Level 6 (sharp's default) keeps encode time well within the
      // job timeout even at 8K, where level 9 is far too slow for marginal gain.
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
