// Tailwind theme is fed by the single design-token source of truth.
// Edit design/tokens.json and run `node design/generate.mjs` to change it.
const tokens = require("../design/generated/tailwind-tokens.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: { sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] },
      fontSize: tokens.fontSize,
      borderRadius: tokens.borderRadius,
      spacing: tokens.spacing,
      letterSpacing: tokens.letterSpacing,
      transitionTimingFunction: tokens.transitionTimingFunction,
      maxWidth: tokens.maxWidth,
      transitionDuration: { ui: "140", panel: "240" },
    },
  },
  plugins: [],
};
