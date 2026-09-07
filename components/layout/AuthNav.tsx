"use client";

import Link from "next/link";
import { useState } from "react";
import { Coins, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Pill } from "@/components/ui/Pill";
import { Dropdown } from "@/components/ui/Dropdown";

/**
 * AuthNav — the right side of the header. Signed out: Sign in + Upgrade. Signed
 * in: the live credit balance and an account menu. Links are styled directly
 * (no button nested in an anchor).
 */
export function AuthNav() {
  const { user, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <span className="hidden h-9 w-24 animate-pulse rounded-md bg-sunken lg:block" />;
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md px-5 text-xs font-semibold text-ink-mid transition-colors hover:bg-amber-tint hover:text-ink"
        >
          Sign in
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-10 items-center justify-center rounded-md bg-amber px-5 text-xs font-semibold text-white transition-colors hover:bg-amber-press active:scale-[0.98]"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/app/billing" className="rounded-pill">
        <Pill tone="amber" icon={<Coins size={13} />}>
          <span className="tabular">{user.credits}</span>
        </Pill>
      </Link>
      <Dropdown
        align="end"
        trigger={
          <span className="grid h-9 w-9 place-items-center rounded-pill border border-line bg-surface text-ink-mid hover:border-line-strong">
            <UserIcon size={16} />
          </span>
        }
        items={[
          { label: "Dashboard", href: "/app", icon: <LayoutDashboard size={15} /> },
          { label: "Billing", href: "/app/billing", icon: <Coins size={15} /> },
          {
            label: busy ? "Signing out…" : "Sign out",
            icon: <LogOut size={15} />,
            onSelect: async () => {
              setBusy(true);
              await signOut();
              window.location.href = "/";
            },
          },
        ]}
      />
    </div>
  );
}
