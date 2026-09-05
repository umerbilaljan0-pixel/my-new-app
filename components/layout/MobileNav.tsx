"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { PRIMARY_NAV, TOOLS } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Wordmark } from "./Wordmark";

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

/**
 * MobileNav — full-height sheet for phones. Closes on Escape and locks body
 * scroll while open.
 */
export function MobileNav({ open, onClose }: MobileNavProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col bg-surface shadow-float animate-fade-rise">
        <div className="flex h-header items-center justify-between border-b border-line px-5">
          <Wordmark size={18} />
          <IconButton aria-label="Close menu" icon={<X size={20} />} onClick={onClose} />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          <p className="label-eyebrow px-3 py-2">Tools</p>
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={onClose}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-amber-tint"
            >
              {t.label}
              <span className="mt-0.5 block text-2xs font-normal text-ink-low">
                {t.description}
              </span>
            </Link>
          ))}
          <div className="my-2 h-px bg-line" />
          {PRIMARY_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onClose}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-amber-tint"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-line p-4">
          <Button variant="secondary" fullWidth>
            Sign in
          </Button>
          <Button variant="primary" fullWidth>
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}
