import "server-only";
import type { StorageAdapter } from "./types";
import { createLocalAdapter } from "./local";
import { createR2Adapter, type R2Config } from "./r2";

/**
 * getStorage() — selects the storage backend once per server process. If the
 * full R2 configuration is present it uses R2 (production); otherwise it falls
 * back to the local filesystem adapter and logs a one-time warning so it's never
 * a silent surprise. Switching providers is purely a matter of env vars.
 */

let cached: StorageAdapter | null = null;
let warned = false;

function readR2Config(): R2Config | null {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_INPUTS,
    R2_BUCKET_OUTPUTS,
  } = process.env;
  if (
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_INPUTS &&
    R2_BUCKET_OUTPUTS
  ) {
    return {
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucketInputs: R2_BUCKET_INPUTS,
      bucketOutputs: R2_BUCKET_OUTPUTS,
    };
  }
  return null;
}

export function getStorage(): StorageAdapter {
  if (cached) return cached;
  const cfg = readR2Config();
  if (cfg) {
    cached = createR2Adapter(cfg);
  } else {
    if (!warned) {
      console.warn(
        "[storage] R2 not configured — using the local filesystem adapter (dev only). Set R2_* env vars for production.",
      );
      warned = true;
    }
    cached = createLocalAdapter();
  }
  return cached;
}

export type { StorageAdapter, StorageBucket } from "./types";
