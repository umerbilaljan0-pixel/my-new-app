import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isGoogleConfigured } from "@/lib/auth/config";
import { buildAuthUrl } from "@/lib/auth/google";

export const runtime = "nodejs";

/** GET /api/auth/google — begin the Google OAuth flow. */
export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Google sign-in isn't configured.", retryable: false } },
      { status: 500 },
    );
  }
  const state = randomUUID();
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("cp_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
