import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

/**
 * SiteShell — the standard chrome (sticky Header + main landmark + Footer) used
 * by the marketing and tool route groups. `<main id="main">` is the skip-link
 * target.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
