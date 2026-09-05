import Link from "next/link";
import { FOOTER_COLUMNS, TRUST_LINE } from "@/lib/nav";
import { Wordmark } from "./Wordmark";

/**
 * Footer — four columns (Tools / Product / Company / Legal) plus the trust line
 * that appears on every page (Section 4) and is backed by a real deletion job.
 */
export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-3">
            <Wordmark size={18} />
            <p className="prose-measure text-2xs text-ink-low">
              Three tools. No signup. Results in seconds.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h3 className="label-eyebrow">{col.heading}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-ink-mid transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-2xs text-ink-low">{TRUST_LINE}</p>
          <p className="text-2xs text-ink-low">
            © {new Date().getFullYear()} CLEANPLATE
          </p>
        </div>
      </div>
    </footer>
  );
}
