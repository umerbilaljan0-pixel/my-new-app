import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hmacSign, hmacVerify } from "@/lib/security";

/**
 * Minimal signed-cookie sessions. A compact token — base64url(JSON).HMAC — keeps
 * auth self-contained (no session table) and works in every runtime. Signed with
 * AUTH_SECRET via lib/security.
 */

export const SESSION_COOKIE = "cp_session";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  userId: string;
  email: string;
  name: string | null;
}

interface TokenPayload extends SessionUser {
  exp: number;
}

export function signSession(user: SessionUser): string {
  const payload: TokenPayload = { ...user, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmacSign(body)}`;
}

export function verifySession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!hmacVerify(body, sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return { userId: payload.userId, email: payload.email, name: payload.name ?? null };
  } catch {
    return null;
  }
}

/** Read the session from a NextRequest (API routes / middleware). */
export function getSessionUser(req: NextRequest): SessionUser | null {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Read the session from server-component cookies() (App Router pages). */
export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export function setSession(res: NextResponse, user: SessionUser): void {
  res.cookies.set(SESSION_COOKIE, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearSession(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
