import { type NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/auth/session";
import { accountStore } from "@/lib/db/accounts";
import { isGoogleConfigured, isDevLoginEnabled } from "@/lib/auth/config";

export const runtime = "nodejs";

/** GET /api/auth/me — the current user + balance, and which sign-in methods are
 * available (so the client renders the right controls). */
export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  const authMethods = { google: isGoogleConfigured(), dev: isDevLoginEnabled() };
  if (!session) return jsonResponse({ user: null, authMethods });

  const store = await accountStore();
  const user = await store.getUserById(session.userId);
  if (!user) return jsonResponse({ user: null, authMethods });

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      credits: user.credits,
      plan: user.plan,
    },
    authMethods,
  });
}
