import "server-only";
import sharp from "sharp";
import { PREVIEW_LONG_EDGE } from "./config";

/**
 * Build the free-tier preview (a PREVIEW_LONG_EDGE px PNG, alpha preserved) from
 * a full-resolution result. Shared by the job processor and the client-result
 * ingest endpoint so both produce byte-identical previews.
 */
export async function makePreview(
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const buf = await sharp(Buffer.from(bytes))
    .resize({
      width: width >= height ? PREVIEW_LONG_EDGE : undefined,
      height: height > width ? PREVIEW_LONG_EDGE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  return new Uint8Array(buf);
}
