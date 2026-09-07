import type { Faq } from "@/lib/seo";
import type { Tool } from "@/lib/validation/jobs";

export interface ToolContent {
  slug: string;
  tool: Tool;
  eyebrow: string;
  h1: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  whatItDoes: string[];
  steps: { title: string; body: string }[];
  useCases: string[];
  faqs: Faq[];
  related: { label: string; href: string }[];
}

/** Long-form SEO content for the tool pages (Section 16 — thin pages don't rank). */
export const TOOL_CONTENT: Record<"remove-watermark" | "remove-background" | "upscale-image", ToolContent> = {
  "remove-watermark": {
    slug: "remove-watermark",
    tool: "erase",
    eyebrow: "Erase",
    h1: "Remove watermarks, logos, text and objects",
    intro:
      "We detect overlays automatically — or brush over anything you want gone. Only what you paint changes; the rest of the image is untouched.",
    metaTitle: "Remove watermarks, logos & objects from images",
    metaDescription:
      "Free watermark and object remover. Automatic overlay detection or a full mask editor, with clean inpainting that only changes what you paint. No signup.",
    whatItDoes: [
      "CLEANPLATE's Erase tool removes watermarks, logos, date stamps, text and small unwanted objects from a photo and rebuilds what was underneath.",
      "On upload it runs an automatic pass that looks for semi-transparent overlays and repeated marks, and draws them as cyan boxes you can accept or ignore. Nothing is erased until you confirm.",
      "For anything the detector misses, the mask editor gives you a brush, a rectangle and an eraser. Paint slightly past the edge of what you want gone — the mask is expanded a few pixels before processing, which is the single biggest factor in a clean result.",
    ],
    steps: [
      { title: "Drop your image", body: "PNG, JPG, WEBP or HEIC, up to 25MB. It's processed in your browser first, then uploaded securely." },
      { title: "Confirm or paint the mask", body: "Accept the auto-detected areas, or brush over the watermark yourself. Undo and redo as you go." },
      { title: "Download the result", body: "Get a free 1200px version, or full resolution with a credit. Only the masked pixels changed." },
    ],
    useCases: [
      "Removing a stock-photo watermark from an image you've licensed",
      "Cleaning a logo or date stamp off your own product photography",
      "Deleting a stray object or blemish from a background",
      "Tidying screenshots by erasing cursors, tooltips or banners",
    ],
    faqs: [
      { q: "Does it change the whole image?", a: "No. Only the pixels you mask (plus a small dilation) are rebuilt. Everywhere else is bit-identical to your original." },
      { q: "What happens to my image?", a: "It's deleted from our servers within 24 hours, always, and EXIF metadata is stripped before it's uploaded." },
      { q: "Is removing a watermark legal?", a: "Only on images you own or are licensed to modify. Removing ownership marks from someone else's work is unlawful in most countries — see our acceptable-use policy." },
      { q: "What file types work?", a: "PNG, JPG, WEBP and HEIC in; PNG or JPG out, with transparency supported on PNG." },
    ],
    related: [
      { label: "Remove a background", href: "/remove-background" },
      { label: "Upscale to 4K", href: "/upscale-image" },
    ],
  },

  "remove-background": {
    slug: "remove-background",
    tool: "cutout",
    eyebrow: "Cut Out",
    h1: "Remove the background in one click",
    intro:
      "Drop an image and get a clean cut-out with transparency. Works best on product shots and clear subjects. No account, results in seconds.",
    metaTitle: "Remove image background — free, one click",
    metaDescription:
      "Free background remover. One-click subject isolation with clean edges, exported transparent or on a solid colour. No signup, results in seconds.",
    whatItDoes: [
      "Cut Out isolates the subject of a photo and removes everything behind it, leaving a true alpha channel — not a hard, jagged cut.",
      "It's tuned for the images most people need cleaned: products on a plain background, people, and clear single subjects.",
      "Export the result with transparency for use anywhere, or drop it straight onto a solid colour for a clean e-commerce look.",
    ],
    steps: [
      { title: "Drop your image", body: "PNG, JPG, WEBP or HEIC. No account needed to try it." },
      { title: "We isolate the subject", body: "One pass removes the background and keeps clean edges — no fiddling required." },
      { title: "Download it", body: "Free at 1200px, or full resolution for a credit. Transparent PNG or on a colour." },
    ],
    useCases: [
      "Product photos for a store, marketplace or catalogue",
      "Profile pictures and headshots on a clean background",
      "Cut-outs for thumbnails, banners and social posts",
      "Removing a distracting background before printing",
    ],
    faqs: [
      { q: "Do I need an account?", a: "No. Your first images work with no signup at all. Full resolution costs a credit." },
      { q: "Will the edges look clean?", a: "Cut Out produces a real alpha channel with soft edges, so hair and fine detail hold up better than a hard cut." },
      { q: "Can I put it on a coloured background?", a: "Yes — export transparent, or composite the cut-out onto a solid colour for a studio look." },
      { q: "What happens to my image?", a: "It's deleted from our servers within 24 hours, and EXIF is stripped before upload." },
    ],
    related: [
      { label: "Remove a watermark", href: "/remove-watermark" },
      { label: "Upscale to 4K", href: "/upscale-image" },
    ],
  },

  "upscale-image": {
    slug: "upscale-image",
    tool: "uplift",
    eyebrow: "Upscale",
    h1: "Sharpen and enlarge to 1080p, 2K or 4K",
    intro:
      "Pick an output resolution — we handle the rest and resample to the exact size, preserving the aspect ratio. No account, results in seconds.",
    metaTitle: "Upscale images to 4K — free image upscaler",
    metaDescription:
      "Free image upscaler. Enlarge to 1080p, 2K or 4K at exact dimensions, preserving aspect ratio, and recover detail instead of just stretching pixels. No signup.",
    whatItDoes: [
      "Upscale enlarges an image to a target resolution and sharpens detail, rather than simply stretching pixels and going soft.",
      "You choose an output size — 1080p, 2K or 4K — and CLEANPLATE picks the right scale, runs it, and resamples to the exact dimensions while keeping your aspect ratio.",
      "If a target would blow the image up more than 4×, it's greyed out with a note, so you don't ask for a size the source can't support.",
    ],
    steps: [
      { title: "Drop your image", body: "Any common format, up to 25MB. Small images are fine — you'll see which targets are available." },
      { title: "Pick a resolution", body: "1080p, 2K or 4K. You'll see the exact output dimensions and the credit cost before you commit." },
      { title: "Download it", body: "Free at 1200px, or the full upscaled resolution for a credit. A 4K upscale costs 2." },
    ],
    useCases: [
      "Enlarging a small product photo for print or a hero banner",
      "Upscaling an old or low-resolution image so it holds up on a big screen",
      "Preparing artwork and illustrations at higher resolution",
      "Getting a usable size out of a cropped screenshot",
    ],
    faqs: [
      { q: "How much bigger can I go?", a: "Up to 4× the source's long edge. Targets beyond that are greyed out — for a small image, 2K is often the best result." },
      { q: "Does it add detail or just stretch?", a: "It resamples with a high-quality method and can sharpen and denoise, recovering perceived detail rather than blurring." },
      { q: "What's the exact output size?", a: "You'll see it before you commit — targets are exact resolutions (e.g. 800×600 becomes 2560×1920 at 2K), not vague multipliers." },
      { q: "What does 4K cost?", a: "A credit covers images up to 2K; a 4K upscale costs 2 credits. Failed jobs are never charged." },
    ],
    related: [
      { label: "Remove a background", href: "/remove-background" },
      { label: "Remove a watermark", href: "/remove-watermark" },
    ],
  },
};
