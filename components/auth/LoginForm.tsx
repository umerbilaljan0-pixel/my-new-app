"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/auth/AuthProvider";

export interface LoginFormProps {
  google: boolean;
  dev: boolean;
  next: string;
}

/**
 * LoginForm — Google when configured, plus a dev email login fallback when it
 * isn't (so the app is usable and testable without an external IdP).
 */
export function LoginForm({ google, dev, next }: LoginFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const safeNext = next.startsWith("/") ? next : "/app";

  const devLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error?.message ?? "Couldn't sign in.");
        return;
      }
      await refresh();
      router.push(safeNext);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-hairline">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-lg font-semibold text-ink">Sign in to CLEANPLATE</h1>
        <p className="text-2xs text-ink-low">Your free images work with no account — sign in to buy credits.</p>
      </div>

      {google && (
        <a
          href={`/api/auth/google`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-line-strong hover:bg-sunken"
        >
          <LogIn size={16} />
          Continue with Google
        </a>
      )}

      {google && dev && <div className="flex items-center gap-3 text-2xs text-ink-low"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>}

      {dev && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void devLogin();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={error ?? undefined}
          />
          <Button type="submit" variant="primary" fullWidth loading={busy}>
            Continue
          </Button>
          <p className="text-center text-2xs text-ink-low">
            Dev sign-in (no Google configured). Set <span className="tabular">GOOGLE_CLIENT_ID</span> to enable Google.
          </p>
        </form>
      )}

      {!google && !dev && (
        <p className="text-center text-sm text-ink-mid">Sign-in isn&apos;t configured on this deployment.</p>
      )}
    </div>
  );
}
