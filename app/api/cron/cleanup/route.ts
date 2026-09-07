import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { runCleanup } from "@/lib/jobs/cleanup";

export const runtime = "nodejs";

/**
 * /api/cron/cleanup — runs the 24-hour purge (Section 13). Protected by a bearer
 * token so it can be wired to a scheduler; when CRON_SECRET is unset (dev) it is
 * open so the deletion job is demonstrable. GET is exposed for Vercel Cron (which
 * issues GET); POST for manual/external triggers.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return errorResponse("UNAUTHORIZED");
  }
  const { purged } = await runCleanup();
  return jsonResponse({ purged });
}

export const GET = handle;
export const POST = handle;
