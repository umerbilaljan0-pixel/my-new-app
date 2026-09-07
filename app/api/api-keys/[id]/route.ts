import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/auth/session";
import { accountStore } from "@/lib/db/accounts";

export const runtime = "nodejs";

/** DELETE /api/api-keys/:id — revoke a key. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(req);
  if (!session) return errorResponse("UNAUTHORIZED");
  const { id } = await ctx.params;
  const store = await accountStore();
  const ok = await store.revokeApiKey(session.userId, id);
  if (!ok) return errorResponse("JOB_NOT_FOUND", { message: "Key not found." });
  return jsonResponse({ revoked: true });
}
