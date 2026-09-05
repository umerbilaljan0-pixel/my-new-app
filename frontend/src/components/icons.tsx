import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

// ---- tool glyphs ----
export const IErase = (p: P) => (
  <svg {...base(p)}><path d="M7 21h10" /><path d="m5 14 6-6 8 8-3 3H8z" /><path d="m11 8 5 5" /></svg>
);
export const IUplift = (p: P) => (
  <svg {...base(p)}><path d="M12 20V6" /><path d="m6 12 6-6 6 6" /><path d="M5 4h14" /></svg>
);
export const IRevive = (p: P) => (
  <svg {...base(p)}><path d="M12 3a9 9 0 1 0 9 9" /><path d="M21 3v6h-6" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IIsolate = (p: P) => (
  <svg {...base(p)}><path d="M4 8V5a1 1 0 0 1 1-1h3" /><path d="M16 4h3a1 1 0 0 1 1 1v3" /><path d="M20 16v3a1 1 0 0 1-1 1h-3" /><path d="M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3.2" /></svg>
);
export const IExtend = (p: P) => (
  <svg {...base(p)}><rect x="3" y="7" width="10" height="10" rx="1" /><path d="M17 5v14" /><path d="M20 8v8" /></svg>
);
export const ISmooth = (p: P) => (
  <svg {...base(p)}><path d="M3 12h3l2-5 4 10 2-5h3" /><path d="M19 12h2" /></svg>
);
export const IClarify = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" opacity=".5" /><path d="m8 16 3-3 2 2 3-4" /></svg>
);
export const IStack = (p: P) => (
  <svg {...base(p)}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
);

// ---- ui glyphs ----
export const IQueue = (p: P) => (<svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h10" /></svg>);
export const ISettings = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>);
export const IPlay = (p: P) => (<svg {...base(p)}><path d="m7 4 12 8-12 8V4Z" fill="currentColor" stroke="none" /></svg>);
export const IPause = (p: P) => (<svg {...base(p)}><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" /></svg>);
export const ICancel = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IRetry = (p: P) => (<svg {...base(p)}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 4v5h-5" /></svg>);
export const IFolder = (p: P) => (<svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>);
export const ISun = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const IMoon = (p: P) => (<svg {...base(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>);
export const IHelp = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 .9-1 1.7" /><path d="M12 17h.01" /></svg>);
export const IUpload = (p: P) => (<svg {...base(p)}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>);
export const IDownload = (p: P) => (<svg {...base(p)}><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 19v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" /></svg>);
