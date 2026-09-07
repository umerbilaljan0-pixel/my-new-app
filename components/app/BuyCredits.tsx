"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * BuyCredits — starts the $2 / 20-credit purchase (Section 12). With Stripe
 * configured it opens Checkout; in dev it grants immediately and returns here.
 */
export function BuyCredits({ returnTo }: { returnTo?: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnTo ? { returnTo } : {}),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast({ type: "error", title: "Couldn't start checkout", description: data?.error?.message });
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({ type: "error", title: "Couldn't reach the server" });
      setBusy(false);
    }
  };

  return (
    <Button variant="primary" leadingIcon={<Coins size={16} />} loading={busy} onClick={buy}>
      Get 20 credits — $2
    </Button>
  );
}
