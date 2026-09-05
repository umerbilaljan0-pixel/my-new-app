import type { Config } from "tailwindcss";
import {
  tailwindColors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  boxShadow,
  motion,
  screens,
  layout,
} from "./lib/design-tokens";

/**
 * Tailwind is configured entirely from lib/design-tokens.ts — the single source
 * of truth. No literal colour/size values appear here.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    screens,
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff", // allowed literal: pure white for on-amber button text
      ...tailwindColors,
    },
    fontSize: {
      "2xs": [fontSize["2xs"], { lineHeight: "1.4" }],
      xs: [fontSize.xs, { lineHeight: "1.5" }],
      sm: [fontSize.sm, { lineHeight: "1.6" }],
      base: [fontSize.base, { lineHeight: "1.6" }],
      lg: [fontSize.lg, { lineHeight: "1.3" }],
      xl: [fontSize.xl, { lineHeight: "1.15" }],
      "2xl": [fontSize["2xl"], { lineHeight: "1.1" }],
      "3xl": [fontSize["3xl"], { lineHeight: "1.05" }],
    },
    extend: {
      fontFamily: {
        display: [fontFamily.display, "system-ui", "sans-serif"],
        sans: [fontFamily.sans, "system-ui", "sans-serif"],
        mono: [fontFamily.mono, "ui-monospace", "monospace"],
      },
      spacing,
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
        pill: radius.pill,
      },
      boxShadow: {
        hairline: boxShadow.hairline,
        float: boxShadow.float,
      },
      maxWidth: {
        content: layout.maxContentWidth,
        prose: layout.proseMaxCh,
      },
      height: {
        header: layout.headerHeight,
      },
      transitionTimingFunction: {
        brand: motion.ease,
      },
      transitionDuration: {
        ui: motion.ui.replace("ms", ""),
        panel: motion.panel.replace("ms", ""),
        sweep: motion.sweep.replace("ms", ""),
      },
      keyframes: {
        "fade-rise": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-rise": `fade-rise ${motion.panel} ${motion.ease}`,
        shimmer: `shimmer 1.6s ${motion.ease} infinite`,
        spin: "spin 0.7s linear infinite",
        "toast-in": `toast-in ${motion.panel} ${motion.ease}`,
      },
    },
  },
  plugins: [],
};

export default config;
