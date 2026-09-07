/**
 * SEO helpers (Section 16). JSON-LD builders for rich results and a canonical
 * site URL. Kept framework-agnostic; rendered via <JsonLd>.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cleanplate.app";
export const SITE_NAME = "CLEANPLATE";

export function abs(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export interface Faq {
  q: string;
  a: string;
}

export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description:
      "Three AI tools for images — erase watermarks, cut out backgrounds, upscale to 4K. No signup.",
    url: SITE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to try, no account. 20 full-resolution images for $2.",
    },
  };
}

export function faqPageLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

export function articleLd(post: {
  title: string;
  description: string;
  date: string;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: abs(`/blog/${post.slug}`),
  };
}

/** Build an OG image URL for a page title/subtitle. */
export function ogImage(title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title });
  if (subtitle) params.set("subtitle", subtitle);
  return abs(`/api/og?${params.toString()}`);
}
