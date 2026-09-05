import "server-only";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hmacSign } from "@/lib/security";
import {
  DEFAULT_PRESIGN_TTL,
  type HeadResult,
  type PresignGetInput,
  type PresignPutInput,
  type PresignResult,
  type StorageAdapter,
  type StorageBucket,
} from "./types";

/**
 * Local filesystem storage adapter — the no-credential dev fallback (spec rule
 * #1: a working fallback, not a mock). Objects are written under a temp
 * directory; presigned URLs are same-origin, single-purpose and expiring, signed
 * with the same HMAC scheme the /api/storage route verifies. Root-relative paths
 * are returned so the browser resolves them against the current origin.
 *
 * This is for development only; production uses R2. lib/storage/index.ts logs a
 * warning when this backend is active.
 */

export const LOCAL_ROOT = path.join(tmpdir(), "cleanplate-storage");

export function objectPath(bucket: StorageBucket, key: string): string {
  // Prevent path traversal: keys are flat, "/"-joined segments only.
  const safeKey = key.replace(/\.\.+/g, "").replace(/^\/+/, "");
  return path.join(LOCAL_ROOT, bucket, safeKey);
}

/** Canonical string that a presigned URL's signature covers. */
export function signPayload(
  op: "put" | "get",
  bucket: StorageBucket,
  key: string,
  exp: number,
): string {
  return `${op}:${bucket}:${key}:${exp}`;
}

function buildUrl(
  op: "put" | "get",
  bucket: StorageBucket,
  key: string,
  expiresIn: number,
): PresignResult {
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const sig = hmacSign(signPayload(op, bucket, key, exp));
  const qs = new URLSearchParams({ bucket, key, exp: String(exp), sig });
  return { url: `/api/storage/${op}?${qs.toString()}`, expiresIn };
}

export function createLocalAdapter(): StorageAdapter {
  return {
    backend: "local",

    async presignPut(input: PresignPutInput): Promise<PresignResult> {
      return buildUrl("put", input.bucket, input.key, input.expiresIn ?? DEFAULT_PRESIGN_TTL);
    },

    async presignGet(input: PresignGetInput): Promise<PresignResult> {
      return buildUrl("get", input.bucket, input.key, input.expiresIn ?? DEFAULT_PRESIGN_TTL);
    },

    async head(bucket: StorageBucket, key: string): Promise<HeadResult> {
      try {
        const stat = await fs.stat(objectPath(bucket, key));
        return { exists: true, bytes: stat.size };
      } catch {
        return { exists: false };
      }
    },

    async delete(bucket: StorageBucket, key: string): Promise<void> {
      await fs.rm(objectPath(bucket, key), { force: true });
    },
  };
}

/** Write bytes for the local PUT route. Kept here so all fs paths live together. */
export async function writeLocalObject(
  bucket: StorageBucket,
  key: string,
  body: Uint8Array,
): Promise<void> {
  const dest = objectPath(bucket, key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
}

/** Read bytes for the local GET route. Returns null if missing. */
export async function readLocalObject(
  bucket: StorageBucket,
  key: string,
): Promise<Uint8Array | null> {
  try {
    return await fs.readFile(objectPath(bucket, key));
  } catch {
    return null;
  }
}
