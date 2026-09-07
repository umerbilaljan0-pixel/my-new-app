import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Blog content (Section 16). Posts are MDX files in content/blog with
 * frontmatter (title, description, date, tags). Read at build/request time.
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  tags: string[];
  readingMinutes: number;
}

export interface Post extends PostMeta {
  content: string; // MDX body
}

async function readFilenames(): Promise<string[]> {
  try {
    const files = await fs.readdir(BLOG_DIR);
    return files.filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }
}

function parse(slug: string, raw: string): Post {
  const { data, content } = matter(raw);
  const words = content.split(/\s+/).length;
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingMinutes: Math.max(1, Math.round(words / 200)),
    content,
  };
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const files = await readFilenames();
  const posts = await Promise.all(
    files.map(async (f) => {
      const raw = await fs.readFile(path.join(BLOG_DIR, f), "utf8");
      const { content: _c, ...meta } = parse(f.replace(/\.mdx$/, ""), raw);
      void _c;
      return meta as PostMeta;
    }),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const raw = await fs.readFile(path.join(BLOG_DIR, `${slug}.mdx`), "utf8");
    return parse(slug, raw);
  } catch {
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  return (await readFilenames()).map((f) => f.replace(/\.mdx$/, ""));
}
