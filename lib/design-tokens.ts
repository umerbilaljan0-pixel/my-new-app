/**
 * design-tokens.ts — THE SINGLE SOURCE OF ALL VISUAL CONSTANTS.
 *
 * Per the CLEANPLATE spec (Section 3): every colour, size, radius, duration and
 * font lives here and nowhere else. No raw hex value may appear anywhere else in
 * the codebase.
 *
 * Consumers:
 *   - tailwind.config.ts imports { tailwindColors, radius, spacing, ... }
 *   - app/globals-theme.tsx renders themeCssVars() into a <style> in <head> so
 *     the runtime colours are driven entirely from this file (light + dark).
 *
 * Tailwind colour utilities reference the CSS custom properties (e.g.
 * `bg-amber` → `background-color: var(--amber)`), so a token change here flows to
 * both the CSS variables and every utility class with no duplication.
 */

/** A semantic colour token name. Both themes must define the same set. */
export type ColorToken =
  | "paper"
  | "surface"
  | "sunken"
  | "line"
  | "line-strong"
  | "ink"
  | "ink-mid"
  | "ink-low"
  | "amber"
  | "amber-press"
  | "amber-tint"
  | "cyan"
  | "cyan-tint"
  | "ok"
  | "ok-tint"
  | "danger"
  | "danger-tint"
  | "warn"
  | "warn-tint";

export type ColorScale = Record<ColorToken, string>;

/**
 * Light theme (default).
 *
 * NOTE on --ink-low: the spec lists #8B9199 but instructs (Section 3.8) to
 * "verify --ink-low on --paper — darken if it fails" WCAG AA. #8B9199 on #FCFCFA
 * measures ~3.0:1 which fails the 4.5:1 requirement for the 12px labels/captions
 * it is used for, so it is darkened to #6B7177 (~4.8:1). Documented deviation.
 */
export const lightColors: ColorScale = {
  paper: "#FCFCFA",
  surface: "#FFFFFF",
  sunken: "#F4F4F1",
  line: "#E6E6E1",
  "line-strong": "#D4D4CE",
  ink: "#0E1013",
  "ink-mid": "#5A6069",
  "ink-low": "#6B7177", // AA-adjusted from spec #8B9199
  amber: "#FF9500",
  "amber-press": "#E07E00",
  "amber-tint": "#FFF4E3",
  cyan: "#00B8D4",
  "cyan-tint": "#E0F7FB",
  ok: "#10B981",
  "ok-tint": "#E7F8F1",
  danger: "#E5484F",
  "danger-tint": "#FDEDEE",
  warn: "#F5A524",
  "warn-tint": "#FEF3E0",
};

/**
 * Dark theme. The spec omits a few tints in dark; they are given dark-native
 * values here so the full token set is always defined.
 */
export const darkColors: ColorScale = {
  paper: "#0C0D0F",
  surface: "#141619",
  sunken: "#1B1E22",
  line: "#262A2F",
  "line-strong": "#363B42",
  ink: "#F0F1F3",
  "ink-mid": "#9CA2AB",
  "ink-low": "#6B7178",
  amber: "#FFA51F",
  "amber-press": "#E08D0C",
  "amber-tint": "#2A2015",
  cyan: "#22D3EE",
  "cyan-tint": "#0E2B31",
  ok: "#34D399",
  "ok-tint": "#10231C",
  danger: "#FF6B6B",
  "danger-tint": "#2A1517",
  warn: "#F5A524",
  "warn-tint": "#2A2015",
};

/** Typography families. Wired to the next/font CSS variables in app/layout.tsx. */
export const fontFamily = {
  display: "var(--font-inter-tight)",
  sans: "var(--font-inter)",
  mono: "var(--font-jetbrains-mono)",
} as const;

/** Type scale in px (Section 3.3). */
export const fontSize = {
  "2xs": "12px",
  xs: "14px",
  sm: "16px",
  base: "18px",
  lg: "22px",
  xl: "30px",
  "2xl": "44px",
  "3xl": "60px",
} as const;

/** Spacing scale — base unit 4px (Section 3.4). */
export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  30: "120px",
} as const;

/** Corner radii (Section 3.4). */
export const radius = {
  none: "0px",
  sm: "6px", // checkboxes
  md: "10px", // buttons / inputs
  lg: "16px", // cards
  xl: "20px", // hero panels
  pill: "999px",
} as const;

/** The only two shadows allowed in the system (Section 3.4). */
export const boxShadow = {
  hairline: "0 1px 2px rgba(14,16,19,0.05)",
  float: "0 1px 2px rgba(14,16,19,0.05), 0 8px 24px rgba(14,16,19,0.06)",
} as const;

/** Motion tokens (Section 3.4). */
export const motion = {
  ui: "160ms",
  panel: "240ms",
  ease: "cubic-bezier(0.2,0,0,1)",
  sweep: "900ms",
} as const;

/** Breakpoints (Section 3.5). */
export const screens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;

/** Layout constants. */
export const layout = {
  maxContentWidth: "1200px",
  gutter: "24px",
  headerHeight: "64px",
  proseMaxCh: "68ch",
} as const;

/* ------------------------------------------------------------------ */
/* Derived exports for Tailwind + the CSS-variable bridge.            */
/* ------------------------------------------------------------------ */

/**
 * Convert a #RGB or #RRGGBB hex string to a space-separated "r g b" channel
 * triple. The CSS custom properties hold channels (not full colours) so that:
 *   - Tailwind utilities support opacity modifiers via `rgb(var(--x) / a)`, and
 *   - raw CSS can reference a colour with a plain `rgb(var(--x))`.
 */
export function hexToChannels(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Tailwind colour map: each semantic token resolves to its CSS variable, so
 * utilities like `text-ink` / `bg-amber` follow the active theme automatically.
 * The `<alpha-value>` placeholder lets opacity modifiers (e.g. `bg-ink/40`,
 * `border-amber/30`) work.
 */
export const tailwindColors: Record<ColorToken, string> = (
  Object.keys(lightColors) as ColorToken[]
).reduce((acc, token) => {
  acc[token] = `rgb(var(--${token}) / <alpha-value>)`;
  return acc;
}, {} as Record<ColorToken, string>);

function cssVarBlock(scale: ColorScale): string {
  return (Object.keys(scale) as ColorToken[])
    .map((token) => `  --${token}: ${hexToChannels(scale[token])};`)
    .join("\n");
}

/**
 * The complete theming CSS, generated from the token objects above so no hex is
 * ever duplicated into a stylesheet. Rendered once in <head>.
 *
 * Order of precedence matches the spec's theme model:
 *   1. `:root` carries the light palette (default).
 *   2. `@media (prefers-color-scheme: dark)` swaps to dark unless the user has
 *      explicitly chosen light via the toggle (`[data-theme="light"]`).
 *   3. `[data-theme="dark"]` forces dark regardless of system preference.
 */
export function themeCssVars(): string {
  return [
    `:root {\n${cssVarBlock(lightColors)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${cssVarBlock(
      darkColors,
    )}\n  }\n}`,
    `:root[data-theme="dark"] {\n${cssVarBlock(darkColors)}\n}`,
  ].join("\n\n");
}
