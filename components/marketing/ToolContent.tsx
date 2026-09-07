import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { JsonLd } from "./JsonLd";
import { faqPageLd, breadcrumbLd } from "@/lib/seo";
import type { ToolContent as ToolContentData } from "@/lib/content/tools";

/**
 * ToolContent — the long-form SEO section below a tool (Section 16). Genuine
 * content (what it does, steps, use cases, FAQ) plus FAQPage + BreadcrumbList
 * JSON-LD and internal links to the other tools.
 */
export function ToolContent({ content }: { content: ToolContentData }) {
  return (
    <div className="mt-20 flex flex-col gap-16">
      <JsonLd
        data={[
          faqPageLd(content.faqs),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: content.eyebrow, path: `/${content.slug}` },
          ]),
        ]}
      />

      <section className="prose-measure mx-auto flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          What {content.eyebrow} does
        </h2>
        {content.whatItDoes.map((p, i) => (
          <p key={i} className="text-base leading-relaxed text-ink-mid">{p}</p>
        ))}
      </section>

      <section className="mx-auto w-full max-w-3xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">How to use it</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {content.steps.map((s, i) => (
            <li key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
              <span className="tabular grid h-9 w-9 place-items-center rounded-md bg-ink text-sm font-medium text-paper">
                {i + 1}
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="text-sm text-ink-mid">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-3xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">What people use it for</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {content.useCases.map((u) => (
            <li key={u} className="flex items-start gap-2 text-sm text-ink-mid">
              <Check size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden />
              {u}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-3xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Questions</h2>
        <div className="mt-6">
          <FAQAccordion faqs={content.faqs} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl">
        <h2 className="font-display text-lg font-semibold text-ink">Other tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {content.related.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group inline-flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-line-strong hover:bg-sunken"
            >
              {r.label}
              <ArrowRight size={15} className="text-ink-low transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
