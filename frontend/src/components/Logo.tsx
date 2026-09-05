// Wordmark: the "A" in PLATE is a solid triangle (crop-mark / play-head glyph).
export function Logo({ size = 18 }: { size?: number }) {
  const tri = size * 0.62;
  return (
    <span
      className="inline-flex items-baseline font-sans font-semibold select-none"
      style={{ fontSize: size, letterSpacing: "-0.03em", color: "var(--text-hi)" }}
      aria-label="CLEANPLATE"
    >
      CLEANPL
      <svg width={tri} height={tri} viewBox="0 0 10 10" style={{ margin: "0 1px", transform: "translateY(1px)" }} aria-hidden>
        <path d="M2 1.2 L8.4 5 L2 8.8 Z" fill="var(--accent)" />
      </svg>
      TE
    </span>
  );
}

// Monogram: triangle inside a 4px-radius square, amber on near-black.
export function Monogram({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="CLEANPLATE">
      <rect x="0" y="0" width="32" height="32" rx="4" fill="var(--bg-void)" stroke="var(--border)" />
      <path d="M12 9 L23 16 L12 23 Z" fill="var(--accent)" />
    </svg>
  );
}
