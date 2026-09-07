import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { ogImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog — guides for cleaning up images",
  description: "How-to walkthroughs and comparisons for removing watermarks, cutting out backgrounds and upscaling images.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "CLEANPLATE Blog", images: [ogImage("Guides for cleaning up images", "CLEANPLATE Blog")] },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  return (
    <div className="container-page py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="label-eyebrow">Blog</span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-2xl">Guides and comparisons</h1>
        <p className="prose-measure mt-4 text-base text-ink-mid">
          Practical, honest walkthroughs for removing watermarks, cutting out backgrounds and upscaling.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-6 transition-colors hover:border-line-strong hover:shadow-hairline"
          >
            <div className="flex items-center gap-2 text-2xs text-ink-low">
              <span className="tabular">{fmtDate(post.date)}</span>
              <span>·</span>
              <span className="tabular">{post.readingMinutes} min read</span>
            </div>
            <h2 className="font-display text-lg font-semibold text-ink">{post.title}</h2>
            <p className="text-sm text-ink-mid">{post.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
