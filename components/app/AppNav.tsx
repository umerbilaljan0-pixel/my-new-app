"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/history", label: "History" },
  { href: "/app/billing", label: "Billing" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-line" aria-label="Account">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-ui ease-brand",
              active ? "border-amber text-ink" : "border-transparent text-ink-mid hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
