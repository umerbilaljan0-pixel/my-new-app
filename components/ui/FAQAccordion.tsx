"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Faq } from "@/lib/seo";

/**
 * FAQAccordion — accessible disclosure list. Pairs with FAQPage JSON-LD emitted
 * separately so the same Q&A powers rich results (Section 16).
 */
export function FAQAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink"
              >
                {f.q}
                <ChevronDown
                  size={16}
                  className={cn("shrink-0 text-ink-low transition-transform duration-ui ease-brand", isOpen && "rotate-180")}
                />
              </button>
            </h3>
            <div hidden={!isOpen} className="px-5 pb-4">
              <p className="prose-measure text-sm text-ink-mid">{f.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
