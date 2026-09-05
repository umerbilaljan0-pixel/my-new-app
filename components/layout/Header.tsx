"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Coins } from "lucide-react";
import { PRIMARY_NAV, TOOLS } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";

export interface HeaderProps {
  /**
   * Signed-in credit balance. When provided the balance pill is shown in place
   * of the "Sign in" affordance treatment. (Wired to real data in Phase 5.)
   */
  credits?: number;
}

/**
 * Header — sticky 64px bar (Section 4). Wordmark left; Tools dropdown + primary
 * links centre; theme toggle, credit pill and CTA right. Collapses to a
 * hamburger sheet under lg.
 */
export function Header({ credits }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-header border-b border-line bg-surface/90 backdrop-blur">
      <div className="container-page flex h-full items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="rounded-md" aria-label="CLEANPLATE home">
            <Wordmark size={20} />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            <Dropdown
              align="start"
              trigger={
                <span className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-ink-mid transition-colors hover:text-ink">
                  Tools
                  <ChevronDown size={15} />
                </span>
              }
              items={TOOLS.map((t) => ({
                label: (
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-ink">{t.label}</span>
                    <span className="text-2xs text-ink-low">{t.description}</span>
                  </span>
                ),
                href: t.href,
              }))}
              menuClassName="min-w-[260px]"
            />
            {PRIMARY_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-mid transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {typeof credits === "number" && (
            <Link href="/app/billing" className="hidden rounded-pill sm:inline-flex">
              <Pill tone="amber" icon={<Coins size={13} />}>
                <span className="tabular">{credits}</span>
              </Pill>
            </Link>
          )}
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
            <Button variant="primary" size="sm">
              Upgrade
            </Button>
          </div>
          <div className="lg:hidden">
            <IconButton
              aria-label="Open menu"
              icon={<Menu size={20} />}
              onClick={() => setMobileOpen(true)}
            />
          </div>
        </div>
      </div>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
