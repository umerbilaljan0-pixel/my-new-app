import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllSlugs, getPost } from "@/lib/blog";
import { mdxComponents } from "@/components/marketing/mdxComponents";
import { JsonLd } from "@/components/marketing/JsonLd";
import { articleLd, breadcrumbLd, ogImage } from "@/lib/seo";

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      images: [ogImage(post.title, "CLEANPLATE Blog")],
    },
  };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="container-page py-16">
      <JsonLd
        data={[
          articleLd(post),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${slug}` },
          ]),
        ]}
      />
      <article className="prose-measure mx-auto">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-2xs font-semibold text-ink-mid transition-colors hover:text-ink">
          <ArrowLeft size={14} /> All posts
        </Link>
        <header className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-2xs text-ink-low">
            <span className="tabular">{fmtDate(post.date)}</span>
            <span>·</span>
            <span className="tabular">{post.readingMinutes} min read</span>
          </div>
          <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink sm:text-2xl">{post.title}</h1>
          <p className="text-base text-ink-mid">{post.description}</p>
        </header>
        <div className="mt-8">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>
      </article>
    </div>
  );
}
