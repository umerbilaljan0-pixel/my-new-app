import "server-only";
import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Anonymous per-browser session id (Sections 12 / 18). Stored in a signed-ish
 * httpOnly cookie; used to scope rate limits and own anonymous jobs before an
 * account exists.
 */
export const SESSION_COOKIE = "cp_sid";

export function getSession(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: randomUUID(), isNew: true };
}

export function setSessionCookie(res: NextResponse, id: string): void {
  res.cookies.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
