"use client";

import { useState } from "react";
import { Download, Coins, LogIn } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { track } from "@/lib/analytics";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

export interface DownloadCardProps {
  jobId: string;
  width?: number;
  height?: number;
  bytes?: number;
  /** Client-computed (browser WASM) result — full resolution downloads free. */
  freeHd?: boolean;
}

/**
 * DownloadCard (Sections 9.5 / 12). Free and full-resolution options side by
 * side, the free option always visible. Full resolution is credit-gated: signed
 * out → sign in; no credits → buy ($2/20); has credits → download HD (charged
 * once). The purchase returns to this exact result via ?restore (session
 * restore, Section 9.5).
 */
export function DownloadCard({ jobId, width, height, bytes, freeHd }: DownloadCardProps) {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const returnTo = typeof window !== "undefined" ? `${window.location.pathname}?restore=${jobId}` : `/?restore=${jobId}`;

  const buyCredits = async () => {
    setBusy(true);
    track("checkout_started", { plan: "starter", from: "download" });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast({ type: "error", title: "Couldn't start checkout" });
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({ type: "error", title: "Couldn't reach the server" });
      setBusy(false);
    }
  };

  const hdColumn = () => {
    if (freeHd) {
      // Computed in the visitor's browser — full resolution is free, no sign-in.
      return (
        <a
          href={`/api/jobs/${jobId}/download?quality=full`}
          download
          onClick={() => track("download_hd", { jobId, engine: "client-wasm" })}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-press active:scale-[0.98]"
        >
          <Download size={16} /> Download full res
        </a>
      );
    }
    if (!user) {
      return (
        <a
          href={`/login?next=${encodeURIComponent(returnTo)}`}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-press active:scale-[0.98]"
        >
          <LogIn size={16} /> Sign in for HD
        </a>
      );
    }
    if (user.credits > 0) {
      return (
        <a
          href={`/api/jobs/${jobId}/download?quality=full`}
          download
          onClick={() => {
            track("download_hd", { jobId });
            setTimeout(() => void refresh(), 1500);
          }}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-press active:scale-[0.98]"
        >
          <Download size={16} /> Download HD
        </a>
      );
    }
    return (
      <button
        type="button"
        onClick={buyCredits}
        disabled={busy}
        className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-press active:scale-[0.98] disabled:opacity-50"
      >
        <Coins size={16} /> {busy ? "Starting…" : "Get credits — $2"}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-line sm:grid-cols-2">
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:border-b-0 sm:border-r">
        <div className="flex flex-col gap-0.5">
          <span className="label-eyebrow">Free</span>
          <span className="tabular text-2xs text-ink-low">1200px · PNG</span>
        </div>
        <a
          href={`/api/jobs/${jobId}/download?quality=preview`}
          download
          onClick={() => track("download_free", { jobId })}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-line-strong hover:bg-sunken active:scale-[0.98]"
        >
          <Download size={16} /> Download free
        </a>
      </div>

      <div className="flex flex-col gap-3 bg-amber-tint/40 p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="label-eyebrow">Full resolution</span>
            <span className="tabular text-2xs text-ink-low">
              {width && height ? `${width} × ${height}` : "Full size"} · PNG{bytes ? ` · ${formatBytes(bytes)}` : ""}
            </span>
          </div>
          <span className="tabular text-2xs font-semibold text-amber-press">
            {freeHd ? "Free" : user && user.credits > 0 ? `${user.credits} left` : "1 credit"}
          </span>
        </div>
        {hdColumn()}
      </div>
    </div>
  );
}
