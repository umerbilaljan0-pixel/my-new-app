import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getAllSlugs } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    "",
    "/pricing",
    "/remove-watermark",
    "/remove-background",
    "/upscale-image",
    "/blog",
    "/api-docs",
    "/support",
    "/legal/terms",
    "/legal/privacy",
    "/legal/acceptable-use",
    "/legal/dmca",
    "/login",
  ];
  const slugs = await getAllSlugs();
  return [
    ...staticRoutes.map((r) => ({ url: `${SITE_URL}${r}`, lastModified: now, changeFrequency: "weekly" as const })),
    ...slugs.map((s) => ({ url: `${SITE_URL}/blog/${s}`, lastModified: now, changeFrequency: "monthly" as const })),
  ];
}
