"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

/**
 * PostHogProvider (Section 17). Initialises PostHog when NEXT_PUBLIC_POSTHOG_KEY
 * is set and records a pageview on each route change. A no-op without the key,
 * so the app runs with no analytics configured.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ready = useRef(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || ready.current) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false,
      person_profiles: "identified_only",
    });
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !ready.current) return;
    posthog.capture("$pageview");
  }, [pathname]);

  return <>{children}</>;
}
