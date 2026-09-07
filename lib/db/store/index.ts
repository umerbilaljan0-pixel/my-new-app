import "server-only";
import type { JobStore } from "./types";
import { createLocalJobStore } from "./local";
import { createPostgresJobStore } from "./postgres";

/**
 * getJobStore() — Postgres when DATABASE_URL is set, otherwise the file-backed
 * local store (dev), with a one-time warning. The Postgres store is created
 * lazily and cached as a promise.
 */
let localCache: JobStore | null = null;
let pgCache: Promise<JobStore> | null = null;
let warned = false;

export function getJobStore(): JobStore | Promise<JobStore> {
  const url = process.env.DATABASE_URL;
  if (url) {
    if (!pgCache) pgCache = createPostgresJobStore(url);
    return pgCache;
  }
  if (!warned) {
    console.warn(
      "[db] DATABASE_URL not set — using the local file-backed job store (dev only).",
    );
    warned = true;
  }
  if (!localCache) localCache = createLocalJobStore();
  return localCache;
}

/** Await-friendly accessor. */
export async function jobStore(): Promise<JobStore> {
  return getJobStore();
}

export type { JobStore } from "./types";
