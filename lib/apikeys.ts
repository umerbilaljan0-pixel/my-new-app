import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { accountStore } from "@/lib/db/accounts";

/**
 * Public API keys (Phase 8). Keys are shown once on creation and stored only as
 * a SHA-256 hash. Format: cp_live_<32 hex>.
 */

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("hex");
  const plaintext = `cp_live_${secret}`;
  return { plaintext, prefix: plaintext.slice(0, 12), hash: hashApiKey(plaintext) };
}

export interface ApiKeyAuth {
  userId: string;
  keyId: string;
}

/** Authenticate a request by its `Authorization: Bearer cp_live_…` header. */
export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyAuth | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token.startsWith("cp_live_")) return null;

  const store = await accountStore();
  const key = await store.findApiKeyByHash(hashApiKey(token));
  if (!key) return null;
  void store.touchApiKey(key.id);
  return { userId: key.userId, keyId: key.id };
}
