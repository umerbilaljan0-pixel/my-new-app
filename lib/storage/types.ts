/**
 * Storage adapter interface (Section 13). Two implementations sit behind it —
 * Cloudflare R2 (production) and a local filesystem store (dev / no-credential
 * fallback) — so switching providers is a one-file change and the rest of the
 * app never imports a concrete backend.
 */

export type StorageBucket = "inputs" | "outputs";

export interface PresignPutInput {
  bucket: StorageBucket;
  key: string;
  contentType: string;
  /** Exact byte length the client will PUT (lets us bound the presigned URL). */
  bytes: number;
  /** Seconds until the URL expires. Defaults to 300 (5 minutes, Section 14). */
  expiresIn?: number;
}

export interface PresignGetInput {
  bucket: StorageBucket;
  key: string;
  expiresIn?: number;
}

export interface PresignResult {
  url: string;
  expiresIn: number;
}

export interface HeadResult {
  exists: boolean;
  bytes?: number;
  contentType?: string;
}

export interface StorageAdapter {
  readonly backend: "r2" | "local";
  /** A single-purpose, expiring URL the browser can PUT the object to. */
  presignPut(input: PresignPutInput): Promise<PresignResult>;
  /** A single-purpose, expiring URL to GET the object back. */
  presignGet(input: PresignGetInput): Promise<PresignResult>;
  /** Existence + basic metadata, used to confirm an object landed. */
  head(bucket: StorageBucket, key: string): Promise<HeadResult>;
  /** Server-side read of an object's bytes (used by the job processor). */
  get(bucket: StorageBucket, key: string): Promise<Uint8Array | null>;
  /** Server-side write of an object (used by the job processor). */
  put(
    bucket: StorageBucket,
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<void>;
  /** Permanently remove an object (24-hour cleanup, Section 13). */
  delete(bucket: StorageBucket, key: string): Promise<void>;
}

export const DEFAULT_PRESIGN_TTL = 300; // seconds
