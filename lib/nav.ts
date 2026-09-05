/** Shared navigation data used by Header, MobileNav and Footer. */

export interface NavLink {
  label: string;
  href: string;
  /** Short description shown in the Tools dropdown. */
  description?: string;
}

export const TOOLS: NavLink[] = [
  {
    label: "Erase",
    href: "/remove-watermark",
    description: "Remove watermarks, logos, text and objects.",
  },
  {
    label: "Cut Out",
    href: "/remove-background",
    description: "Remove the background in one click.",
  },
  {
    label: "Upscale",
    href: "/upscale-image",
    description: "Sharpen and enlarge to 1080p, 2K or 4K.",
  },
];

export const PRIMARY_NAV: NavLink[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "API", href: "/api-docs" },
  { label: "Blog", href: "/blog" },
];

export const FOOTER_COLUMNS: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Tools",
    links: TOOLS,
  },
  {
    heading: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "API", href: "/api-docs" },
      { label: "Blog", href: "/blog" },
      { label: "Component gallery", href: "/gallery" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Support", href: "/support" },
      { label: "Acceptable use", href: "/legal/acceptable-use" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "DMCA", href: "/legal/dmca" },
    ],
  },
];

/** Backed by a real scheduled-deletion job in Phase 3+ (Section 4 / 13). */
export const TRUST_LINE =
  "Your images are deleted from our servers within 24 hours.";
