import { type NextRequest, NextResponse } from "next/server";
import { isGoogleConfigured, appUrl } from "@/lib/auth/config";
import { exchangeCode } from "@/lib/auth/google";
import { accountStore } from "@/lib/db/accounts";
import { setSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/** GET /api/auth/google/callback — finish OAuth, create/find the user, sign in. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const loginUrl = new URL("/login?error=google", appUrl());

  if (!isGoogleConfigured()) return NextResponse.redirect(loginUrl);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get("cp_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const profile = await exchangeCode(code);
    const store = await accountStore();
    const user = await store.upsertUserByEmail({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      authProvider: "google",
    });
    const res = NextResponse.redirect(new URL("/app", appUrl()));
    setSession(res, { userId: user.id, email: user.email, name: user.name });
    res.cookies.set("cp_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("[auth] google callback failed", err);
    return NextResponse.redirect(loginUrl);
  }
}
