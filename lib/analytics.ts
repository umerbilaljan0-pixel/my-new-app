"use client";

import posthog from "posthog-js";

/**
 * Product analytics (Section 17). A thin wrapper over PostHog that no-ops when
 * PostHog isn't configured, so call sites never need to guard.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, props);
  } catch {
    /* analytics is best-effort */
  }
}
