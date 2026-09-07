import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth/session";
import { SiteShell } from "@/components/layout/SiteShell";
import { AppNav } from "@/components/app/AppNav";

/**
 * Auth-gated app shell (Section 4). Unauthenticated visitors are sent to sign in.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUserFromCookies();
  if (!user) redirect("/login?next=/app");

  return (
    <SiteShell>
      <div className="container-page py-10">
        <AppNav />
        <div className="pt-8">{children}</div>
      </div>
    </SiteShell>
  );
}
