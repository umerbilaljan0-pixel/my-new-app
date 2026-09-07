import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api/respond";
import { isDevLoginEnabled } from "@/lib/auth/config";
import { accountStore } from "@/lib/db/accounts";
import { setSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  name: z.string().max(80).optional(),
});

/**
 * POST /api/auth/dev-login — the no-external-IdP fallback sign-in (Section: auth).
 * Available only when Google isn't configured (self-host / local dev). Creates or
 * loads a user by email and signs them in.
 */
export async function POST(req: NextRequest) {
  if (!isDevLoginEnabled()) {
    return errorResponse("UNAUTHORIZED", { message: "Dev login is disabled." });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "Enter a valid email." });
  }
  const store = await accountStore();
  const user = await store.upsertUserByEmail({
    email: parsed.data.email,
    name: parsed.data.name ?? parsed.data.email.split("@")[0],
    authProvider: "dev",
  });
  const res = NextResponse.json({ ok: true });
  setSession(res, { userId: user.id, email: user.email, name: user.name });
  return res;
}
