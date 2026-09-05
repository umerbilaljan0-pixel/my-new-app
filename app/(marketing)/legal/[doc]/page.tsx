import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Legal documents. The acceptable-use policy carries the real, plainly-stated
 * text from the spec (Section 11.5). Terms, privacy and DMCA are stubbed with
 * an honest note and finalised (with counsel) in Phase 6.
 */
const DOCS: Record<
  string,
  { title: string; intro: string; body: string[]; draft?: boolean }
> = {
  "acceptable-use": {
    title: "Acceptable use",
    intro: "CLEANPLATE is for images you own or are licensed to modify.",
    body: [
      "Removing copyright notices, credit lines or ownership marks from someone else's work is unlawful in most countries regardless of the tool used to do it.",
      "Do not upload other people's copyrighted material to strip its marks.",
      "We respond to takedown requests at the address on the DMCA page.",
      "CLEANPLATE does not detect, target or defeat C2PA, SynthID or similar provenance signatures. Automatic overlay detection operates on visual overlay characteristics only.",
    ],
  },
  terms: {
    title: "Terms of service",
    intro: "The terms that govern your use of CLEANPLATE.",
    draft: true,
    body: [
      "The full terms of service are being finalised with counsel and will be published before launch.",
      "By using CLEANPLATE you agree to the acceptable-use policy.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "What we collect, and what we do with it.",
    draft: true,
    body: [
      "Uploaded images are deleted from our servers within 24 hours.",
      "EXIF metadata is stripped from every upload in your browser before it leaves your device, and again on our servers.",
      "The full privacy policy, including the analytics we collect, is being finalised and will be published before launch.",
    ],
  },
  dmca: {
    title: "DMCA & takedowns",
    intro: "How to report content and request removal.",
    draft: true,
    body: [
      "To report content that infringes your rights, email dmca@cleanplate.app with the URL, a description of the work, and a statement of good-faith belief.",
      "We respond to valid takedown requests promptly.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  const entry = DOCS[doc];
  if (!entry) return { title: "Legal" };
  return { title: entry.title, description: entry.intro };
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const entry = DOCS[doc];
  if (!entry) notFound();

  return (
    <div className="container-page py-20">
      <article className="prose-measure mx-auto flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            {entry.title}
          </h1>
          <p className="text-base text-ink-mid">{entry.intro}</p>
          {entry.draft && (
            <p className="text-2xs text-ink-low">
              Draft — final version published before launch.
            </p>
          )}
        </header>
        {entry.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-ink-mid">
            {p}
          </p>
        ))}
      </article>
    </div>
  );
}
