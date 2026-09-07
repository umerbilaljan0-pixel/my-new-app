import "server-only";
import sharp from "sharp";
import type { DetectBox } from "@/lib/validation/jobs";

/**
 * Overlay detection for ERASE (Section 8.1). A real local-contrast / edge-energy
 * heuristic: compare a greyscale plate against a heavily-blurred copy of itself
 * to surface high-frequency regions (text, logos and semi-transparent marks),
 * then group them into candidate boxes with a confidence score.
 *
 * It deliberately operates on visual characteristics only and is never tuned
 * against provenance signals (C2PA / SynthID), per Section 18.
 */

const WORK_LONG_EDGE = 400;
const MAX_BOXES = 6;

export async function detectOverlays(bytes: Uint8Array): Promise<DetectBox[]> {
  const meta = await sharp(Buffer.from(bytes)).metadata();
  const ow = meta.width ?? 0;
  const oh = meta.height ?? 0;
  if (!ow || !oh) return [];

  const scale = Math.min(1, WORK_LONG_EDGE / Math.max(ow, oh));
  const sw = Math.max(1, Math.round(ow * scale));
  const sh = Math.max(1, Math.round(oh * scale));

  const gray = await sharp(Buffer.from(bytes)).resize(sw, sh, { fit: "fill" }).greyscale().raw().toBuffer();
  const blur = await sharp(Buffer.from(bytes)).resize(sw, sh, { fit: "fill" }).greyscale().blur(6).raw().toBuffer();

  const n = sw * sh;
  const energy = new Float32Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const e = Math.abs(gray[i]! - blur[i]!);
    energy[i] = e;
    mean += e;
  }
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (energy[i]! - mean) ** 2;
  const std = Math.sqrt(variance / n);
  const threshold = Math.max(8, mean + 1.4 * std);

  // Connected components (4-neighbour) over the high-energy mask.
  const busy = new Uint8Array(n);
  for (let i = 0; i < n; i++) busy[i] = energy[i]! >= threshold ? 1 : 0;

  const labelStack: number[] = [];
  const visited = new Uint8Array(n);
  const boxes: DetectBox[] = [];
  const minArea = Math.max(12, Math.round(n * 0.002));

  for (let start = 0; start < n; start++) {
    if (!busy[start] || visited[start]) continue;
    let minX = sw, minY = sh, maxX = 0, maxY = 0, area = 0, sumE = 0;
    labelStack.length = 0;
    labelStack.push(start);
    visited[start] = 1;
    while (labelStack.length) {
      const p = labelStack.pop()!;
      const x = p % sw;
      const y = (p - x) / sw;
      area++;
      sumE += energy[p]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && busy[p - 1] && !visited[p - 1]) { visited[p - 1] = 1; labelStack.push(p - 1); }
      if (x < sw - 1 && busy[p + 1] && !visited[p + 1]) { visited[p + 1] = 1; labelStack.push(p + 1); }
      if (y > 0 && busy[p - sw] && !visited[p - sw]) { visited[p - sw] = 1; labelStack.push(p - sw); }
      if (y < sh - 1 && busy[p + sw] && !visited[p + sw]) { visited[p + sw] = 1; labelStack.push(p + sw); }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    // Skip specks and near-full-frame regions (a busy photo, not an overlay).
    if (area < minArea) continue;
    if (bw > sw * 0.85 && bh > sh * 0.85) continue;
    const meanE = sumE / area;
    boxes.push({
      x: Math.round(minX / scale),
      y: Math.round(minY / scale),
      width: Math.round(bw / scale),
      height: Math.round(bh / scale),
      confidence: Math.min(1, meanE / 96),
    });
  }

  boxes.sort((a, b) => b.confidence - a.confidence);
  return boxes.slice(0, MAX_BOXES);
}
