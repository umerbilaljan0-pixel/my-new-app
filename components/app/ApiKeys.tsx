"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface ApiKeyRow {
  id: string;
  keyPrefix: string;
  name: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/api-keys", { cache: "no-store" });
    if (res.ok) setKeys((await res.json()).keys ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "API key" }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setFreshKey(data.key);
        await load();
      } else {
        toast({ type: "error", title: "Couldn't create key" });
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      toast({ type: "info", title: "Key revoked" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-lg font-semibold text-ink">API keys</h1>
          <p className="text-2xs text-ink-low">
            Use a key with the <code className="tabular">/api/v1</code> endpoints. Studio tier.
          </p>
        </div>
        <Button variant="primary" size="sm" leadingIcon={<KeyRound size={16} />} loading={busy} onClick={create}>
          Create key
        </Button>
      </div>

      {freshKey && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber/40 bg-amber-tint/50 p-4">
          <p className="text-2xs font-semibold text-amber-press">Copy this key now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="tabular flex-1 overflow-x-auto rounded-md border border-line bg-surface px-3 py-2 text-xs text-ink">
              {freshKey}
            </code>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={copied ? <Check size={14} /> : <Copy size={14} />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(freshKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard blocked */
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-low">Loading…</p>
      ) : keys.length === 0 ? (
        <EmptyState title="No API keys yet" description="Create a key to call the CLEANPLATE API." />
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-4 p-3">
              <div className="flex flex-col">
                <span className="tabular text-sm font-medium text-ink">{k.keyPrefix}…</span>
                <span className="tabular text-2xs text-ink-low">
                  {k.name ?? "Key"} · created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => revoke(k.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-danger/30 bg-danger-tint px-3 text-2xs font-semibold text-danger transition-colors hover:border-danger/60"
              >
                <Trash2 size={14} /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
