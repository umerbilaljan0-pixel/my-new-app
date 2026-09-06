import type { AcceptedMime } from "@/lib/validation/upload";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function extFor(contentType: string): string {
  return EXT[contentType] ?? "bin";
}

/**
 * Content-addressed input key: `<sha>.<ext>` within the `inputs` bucket (the
 * bucket already namespaces it, so the key carries no bucket prefix). Two
 * uploads of identical bytes resolve to the same key, which the Phase 3 cache
 * lookup relies on.
 */
export function inputKey(sha256: string, contentType: AcceptedMime | string): string {
  return `${sha256}.${extFor(contentType)}`;
}

/** Full-resolution result key within the `outputs` bucket. */
export function outputKey(jobId: string): string {
  return `${jobId}.png`;
}

/** Free-tier 1200px preview key within the `outputs` bucket. */
export function previewKey(jobId: string): string {
  return `${jobId}_1200.png`;
}
