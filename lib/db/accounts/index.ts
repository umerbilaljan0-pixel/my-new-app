import "server-only";
import type { AccountStore } from "./types";
import { createLocalAccountStore } from "./local";
import { createPostgresAccountStore } from "./postgres";

let localCache: AccountStore | null = null;
let pgCache: Promise<AccountStore> | null = null;

/** getAccountStore() — Postgres when DATABASE_URL is set, else file-backed local. */
export function getAccountStore(): AccountStore | Promise<AccountStore> {
  const url = process.env.DATABASE_URL;
  if (url) {
    if (!pgCache) pgCache = createPostgresAccountStore(url);
    return pgCache;
  }
  if (!localCache) localCache = createLocalAccountStore();
  return localCache;
}

export async function accountStore(): Promise<AccountStore> {
  return getAccountStore();
}

export type { AccountStore, User, LedgerEntry, ApiKey } from "./types";
