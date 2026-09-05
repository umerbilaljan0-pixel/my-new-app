import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="container-page py-24 text-center">
        <span className="tabular text-xl font-semibold text-ink-low">404</span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
          We couldn&apos;t find that page
        </h1>
        <p className="prose-measure mx-auto mt-3 text-sm text-ink-mid">
          The link may be broken, or the page may have moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-amber px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-press"
        >
          Back to home
        </Link>
      </div>
    </SiteShell>
  );
}
