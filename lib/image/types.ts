/** Output of the client-side image pipeline (Section 9.2). */
export interface ProcessedImage {
  /** The processed bytes to upload (resized if needed, EXIF stripped). */
  blob: Blob;
  contentType: "image/png" | "image/jpeg";
  bytes: number;
  /** Final dimensions after any downscale. */
  width: number;
  height: number;
  /** Hex SHA-256 of the processed bytes (cache key / integrity). */
  sha256: string;
  resized: boolean;
  originalWidth: number;
  originalHeight: number;
}

/** Error codes the pipeline can raise (mapped to Section 11.6 copy in the UI). */
export type ProcessErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "IMAGE_TOO_SMALL"
  | "IMAGE_DIMENSIONS_EXCEEDED"
  | "DECODE_FAILED";

export class ImageProcessError extends Error {
  code: ProcessErrorCode;
  constructor(code: ProcessErrorCode, message: string) {
    super(message);
    this.name = "ImageProcessError";
    this.code = code;
  }
}

/** Worker message protocol. */
export type WorkerRequest = { id: number; file: File };
export type WorkerResponse =
  | { id: number; ok: true; result: ProcessedImage }
  | { id: number; ok: false; code: ProcessErrorCode; message: string };
