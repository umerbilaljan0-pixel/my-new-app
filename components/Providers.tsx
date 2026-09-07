"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";

/**
 * Providers — client-side context wrappers mounted once at the root.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PostHogProvider>
          <ToastProvider>{children}</ToastProvider>
        </PostHogProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
