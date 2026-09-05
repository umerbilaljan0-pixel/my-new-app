import type { Metadata } from "next";
import { PriceCard } from "@/components/marketing/PriceCard";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free. Pay $2 when you need full resolution. Cancel anything, anytime.",
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "",
    features: [
      "3 images per day",
      "All three tools",
      "Downloads up to 1200px",
      "No account needed",
    ],
    cta: "Start free",
  },
  {
    name: "Starter",
    price: "$2",
    cadence: "once",
    features: [
      "20 HD credits",
      "Never expire",
      "Full resolution, no cap",
      "No subscription",
    ],
    cta: "Get 20 credits",
    featured: true,
    badge: "Most popular",
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "/month",
    features: [
      "300 credits monthly",
      "Batch up to 20 files",
      "Priority queue",
      "30-day history",
    ],
    cta: "Go Pro",
  },
  {
    name: "Studio",
    price: "$29",
    cadence: "/month",
    features: [
      "1500 credits",
      "API access",
      "Commercial licence",
      "Bulk upload",
    ],
    cta: "Get Studio",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-2xl">
          Simple pricing. No surprises.
        </h1>
        <p className="prose-measure mt-4 text-base text-ink-mid">
          Start free. Pay <span className="tabular">$2</span> when you need full
          resolution. Cancel anything, anytime.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <PriceCard key={plan.name} {...plan} />
        ))}
      </div>

      <p className="mt-8 text-center text-2xs text-ink-low">
        <span className="tabular">1</span> credit ={" "}
        <span className="tabular">1</span> image up to 2K. A 4K upscale costs{" "}
        <span className="tabular">2</span>. Failed jobs are never charged.
      </p>
    </div>
  );
}
