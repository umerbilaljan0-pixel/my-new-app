import {
  MAX_DIMENSION,
  MIN_DIMENSION,
  RESIZE_LONG_EDGE,
} from "@/lib/validation/upload";
import { ImageProcessError, type ProcessedImage } from "./types";

/**
 * The pure image-processing pipeline (Section 9.2), runnable in either a Web
 * Worker (OffscreenCanvas) or the main thread (HTMLCanvasElement fallback):
 *
 *   decode → validate dimensions → downscale >4096px long edge → re-encode
 *   (which strips EXIF) → SHA-256 the output bytes.
 *
 * Re-encoding through a canvas is what strips EXIF/GPS metadata: none of the
 * original file's metadata survives being repainted to a fresh bitmap.
 */

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

async function canvasToBlob(
  canvas: AnyCanvas,
  type: string,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  const el = canvas as HTMLCanvasElement;
  return new Promise((resolve, reject) => {
    el.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      type,
      quality,
    );
  });
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // `from-image` bakes EXIF orientation into pixels before we strip metadata.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      // Most commonly a HEIC file in a browser that can't decode it.
      throw new ImageProcessError(
        "UNSUPPORTED_FORMAT",
        "We couldn't read that image in this browser. Try a JPG, PNG or WEBP.",
      );
    }
  }
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  const bitmap = await decode(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  try {
    if (Math.min(originalWidth, originalHeight) < MIN_DIMENSION) {
      throw new ImageProcessError(
        "IMAGE_TOO_SMALL",
        `That image is ${Math.min(originalWidth, originalHeight)}px on its short edge. We need at least ${MIN_DIMENSION}px to work with.`,
      );
    }
    if (Math.max(originalWidth, originalHeight) > MAX_DIMENSION) {
      throw new ImageProcessError(
        "IMAGE_DIMENSIONS_EXCEEDED",
        `That image is ${Math.max(originalWidth, originalHeight)}px on its long edge. The limit is ${MAX_DIMENSION}px.`,
      );
    }

    const longEdge = Math.max(originalWidth, originalHeight);
    const scale = longEdge > RESIZE_LONG_EDGE ? RESIZE_LONG_EDGE / longEdge : 1;
    const resized = scale < 1;
    const width = Math.round(originalWidth * scale);
    const height = Math.round(originalHeight * scale);

    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d") as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) {
      throw new ImageProcessError("DECODE_FAILED", "Couldn't prepare the image canvas.");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    // PNG/WEBP may carry alpha → keep PNG; everything else → JPEG 95.
    const keepAlpha = file.type === "image/png" || file.type === "image/webp";
    const contentType = keepAlpha ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, contentType, 0.95);
    const buf = await blob.arrayBuffer();
    const sha256 = await sha256Hex(buf);

    return {
      blob,
      contentType,
      bytes: blob.size,
      width,
      height,
      sha256,
      resized,
      originalWidth,
      originalHeight,
    };
  } finally {
    bitmap.close();
  }
}
