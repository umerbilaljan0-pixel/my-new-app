import "server-only";
import { NextResponse } from "next/server";
import {
  ERROR_META,
  makeError,
  type ErrorCode,
} from "@/lib/validation/errors";

/**
 * JSON error response in the standard envelope (Section 7.1). Sets the mapped
 * HTTP status and, for rate limits, a Retry-After header.
 */
export function errorResponse(
  code: ErrorCode,
  overrides?: { message?: string; hint?: string; retryAfter?: number },
): NextResponse {
  const meta = ERROR_META[code];
  const body = makeError(code, overrides);
  const headers: Record<string, string> = {};
  if (overrides?.retryAfter != null) {
    headers["Retry-After"] = String(overrides.retryAfter);
  }
  return NextResponse.json(body, { status: meta.status, headers });
}

/** JSON success response. */
export function jsonResponse<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}
