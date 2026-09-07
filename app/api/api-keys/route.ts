import { type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/auth/session";
import { accountStore } from "@/lib/db/accounts";
import { generateApiKey } from "@/lib/apikeys";

export const runtime = "nodejs";

const createSchema = z.object({ name: z.string().max(60).optional() });

/** GET /api/api-keys — list the signed-in user's keys (no secrets). */
export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return errorResponse("UNAUTHORIZED");
  const store = await accountStore();
  const keys = await store.listApiKeys(session.userId);
  return jsonResponse({ keys });
}

/** POST /api/api-keys — create a key; the plaintext is returned exactly once. */
export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) return errorResponse("UNAUTHORIZED");
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  const name = parsed.success ? parsed.data.name ?? null : null;

  const { plaintext, prefix, hash } = generateApiKey();
  const store = await accountStore();
  const key = await store.createApiKey({ userId: session.userId, keyHash: hash, keyPrefix: prefix, name });
  // The only time the plaintext is ever returned.
  return jsonResponse({ id: key.id, name: key.name, prefix: key.keyPrefix, key: plaintext });
}
