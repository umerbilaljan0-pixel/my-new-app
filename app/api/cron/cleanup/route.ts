import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { runCleanup } from "@/lib/jobs/cleanup";

export const runtime = "nodejs";

/**
 * POST /api/cron/cleanup — runs the 24-hour purge (Section 13). Protected by a
 * bearer token so it can be wired to a scheduler (Vercel Cron / external). When
 * CRON_SECRET is unset (dev) it is open, so the deletion job is demonstrable.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return errorResponse("UNAUTHORIZED");
  }
  const { purged } = await runCleanup();
  return jsonResponse({ purged });
}
