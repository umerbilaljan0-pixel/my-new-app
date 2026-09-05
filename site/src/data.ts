export const BRAND = {
  name: "CLEANPLATE",
  tagline: "Remove it. Rebuild it. Ship it.",
  sub: "Eight restoration tools, one queue, running on your own machine.",
};

export interface Tool {
  slug: string;
  name: string;
  verb: string;
  tagline: string;
  body: string;
  models: string[];
}

export const TOOLS: Tool[] = [
  { slug: "erase", name: "Erase", verb: "Erase", tagline: "Watermark, logo and object removal.",
    body: "Mask by brush, rect or lasso with feather, or auto-detect static overlays via temporal median and variance. Masks propagate through shots with optical flow and re-anchor at scene cuts. Only masked pixels change; the audio stream is copied untouched.",
    models: ["LaMa", "ProPainter", "RAFT", "SD-inpaint"] },
  { slug: "uplift", name: "Uplift", verb: "Render", tagline: "Upscale to 1080p, 2K or 4K.",
    body: "Targets are resolutions, not multipliers. Real-ESRGAN, model auto-routed for live-action vs animation, with an optional face-restore pass. Runs the integer network scale then Lanczos to the exact target; tiled inference with 32px overlap, auto-halving on OOM.",
    models: ["Real-ESRGAN", "GFPGAN"] },
  { slug: "revive", name: "Revive", verb: "Render", tagline: "Archival repair.",
    body: "Scratch and dust removal, deblur, denoise, face restoration, and B&W colourisation with a per-region hue override — force a uniform or a flag to the correct colour instead of accepting the model's guess.",
    models: ["SCUNet", "CodeFormer", "GFPGAN", "DDColor"] },
  { slug: "isolate", name: "Isolate", verb: "Export", tagline: "Subject cutout and matting.",
    body: "Click-to-select plus alpha matting for hair edges. Exports PNG alpha, or video with an alpha channel (ProRes 4444 / WebM), plus a separate matte-only pass for compositing.",
    models: ["SAM", "ViTMatte"] },
  { slug: "extend", name: "Extend", verb: "Render", tagline: "Reframe and outpaint.",
    body: "Convert 16:9 to 9:16 or 1:1 by generating the missing plate instead of cropping, with a subject-tracking safe area so the face never drifts out of frame. Presets for YouTube, Shorts, Reels, TikTok, 4:5 and 21:9.",
    models: ["SD-outpaint", "RAFT"] },
  { slug: "smooth", name: "Smooth", verb: "Render", tagline: "Motion.",
    body: "Frame interpolation to 48/60/120fps or retimed slow motion, plus optical-flow stabilisation with a crop-vs-fill choice, and a rolling-shutter fix.",
    models: ["RIFE"] },
  { slug: "clarify", name: "Clarify", verb: "Render", tagline: "Compression repair.",
    body: "De-blocks and de-bands re-uploaded or heavily compressed footage before it hits any other stage. Its own tool, and an optional pre-pass on every other tool.",
    models: ["FBCNN"] },
  { slug: "stack", name: "Stack", verb: "Render", tagline: "The pipeline builder.",
    body: "Drag tools into an order, save it as a named preset — “Archive Restore” = Clarify › Revive › Uplift 4K — and apply it to a whole folder. Presets are exportable JSON so a team shares one recipe.",
    models: [] },
];

export const SPECS: [string, string][] = [
  ["Formats in", "PNG · JPG · WebP · TIFF · MP4 · MOV · MKV · WebM · GIF"],
  ["Formats out", "PNG · MP4 (H.264) · WebM (VP9, alpha) · ProRes 4444"],
  ["GPU — recommended", "NVIDIA CUDA 8GB+ (fp16), AMD ROCm, Apple MPS"],
  ["GPU — supported", "ONNX CPU fallback (slower, no card required)"],
  ["Concurrency", "One GPU job at a time; queue with priority"],
  ["Model cache", "~/.cleanplate/models — verified by SHA256, offline after"],
  ["Privacy", "Runs locally. Footage never leaves your machine."],
  ["Model licences", "Apache-2.0 · BSD-3 · MIT · OpenRAIL-M · research"],
];

export const FAQ: [string, string][] = [
  ["Does my footage get uploaded?",
   "No. The desktop build and the self-hosted web build process everything on your own hardware. Nothing is sent anywhere."],
  ["Do I need a GPU?",
   "No, but it helps. CLEANPLATE detects CUDA, ROCm or Apple MPS at boot and falls back to an ONNX CPU path when there's no card."],
  ["Are the models included?",
   "Never bundled. On first use each tool lists the models it needs with size and licence, downloads to a local cache, verifies the checksum, and then works offline."],
  ["Is it non-destructive?",
   "By law of the tool. Originals are never written to; every job writes a new file and records its parameters so any result can be re-rendered or reverted."],
  ["Can I remove copyright or provenance marks?",
   "No. CLEANPLATE requires you to confirm you own or are licensed for the material, and does not target C2PA, SynthID or similar provenance signatures. See Acceptable Use."],
  ["Can a team share a recipe?",
   "Yes. Stack presets export as plain JSON. Studio adds team seats and shared presets."],
];

export const PRICING = [
  { name: "Free", price: "$0", cadence: "/mo",
    features: ["30 credits / month", "All eight tools", "Visible output watermark", "Local + hosted"],
    cta: "Open Web App", href: "#/download" },
  { name: "Pro", price: "$18", cadence: "/mo", featured: true,
    features: ["Unlimited images", "Priority queue", "No output watermark", "1 credit = 1 image or 10s of 1080p"],
    cta: "Start Pro", href: "#/pricing" },
  { name: "Studio", price: "$64", cadence: "/mo",
    features: ["Everything in Pro", "API keys + webhooks", "Team seats", "Shared Stack presets"],
    cta: "Contact", href: "#/pricing" },
  { name: "Desktop", price: "$149", cadence: "once",
    features: ["Perpetual licence", "Offline activation", "3 machines", "No account, fully offline"],
    cta: "Download", href: "#/download" },
];
