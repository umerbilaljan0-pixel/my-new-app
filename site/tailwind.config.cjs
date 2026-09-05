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
      letterSpacing: tokens.letterSpacing,
      maxWidth: tokens.maxWidth,
    },
  },
  plugins: [],
};
