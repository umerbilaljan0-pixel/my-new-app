import { z } from "zod";

/** Accepted input MIME types (Section 9.1). Canonical list — imported by the
 * DropZone, the upload API and the client pipeline. */
export const ACCEPTED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AcceptedMime = (typeof ACCEPTED_MIME)[number];

/** Hard limits (Sections 9.2 / 14). */
export const MAX_BYTES = 25 * 1024 * 1024; // 25MB upload cap
export const MIN_DIMENSION = 256; // px, shorter edge minimum
export const MAX_DIMENSION = 12000; // px, decompression-bomb guard
export const RESIZE_LONG_EDGE = 4096; // px, client downscale target before upload

/** Extensions used as a fallback when a HEIC file arrives with an empty MIME. */
export const ACCEPTED_EXT_RE = /\.(png|jpe?g|webp|heic|heif)$/i;

export function isAcceptedFile(name: string, type: string): boolean {
  if ((ACCEPTED_MIME as readonly string[]).includes(type)) return true;
  return ACCEPTED_EXT_RE.test(name);
}

const sha256Hex = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected a 64-character hex SHA-256");

/**
 * POST /api/upload request body. The client computes the sha256 of the exact
 * bytes it is about to PUT (used for the cache lookup in Phase 3) and declares
 * its size and type so the server can validate before issuing a presigned URL.
 */
export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ACCEPTED_MIME),
  bytes: z.number().int().positive().max(MAX_BYTES),
  sha256: sha256Hex,
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

/** An absolute https URL (R2) or a root-relative same-origin path (local dev). */
const urlOrPath = z
  .string()
  .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), {
    message: "Expected an absolute URL or a root-relative path",
  });

/** POST /api/upload success response. */
export const uploadResponseSchema = z.object({
  uploadUrl: urlOrPath,
  key: z.string().min(1),
  /** Seconds until the presigned URL expires. */
  expiresIn: z.number().int().positive(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
