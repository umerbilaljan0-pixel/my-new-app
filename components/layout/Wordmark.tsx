import { cn } from "@/lib/utils";

export interface WordmarkProps {
  /** Font size in px for the wordmark text. Triangle scales with it. */
  size?: number;
  className?: string;
  /** Render just the triangle monogram (favicon/app-icon contexts). */
  monogramOnly?: boolean;
}

/**
 * Wordmark — CLEANPLATE in Inter Tight 700, tracking -0.03em, with the `A` in
 * PLATE replaced by a solid amber equilateral triangle pointing up (Section 2).
 * Never stretched/outlined. The triangle reads as a crop mark and a play head.
 */
export function Wordmark({ size = 20, className, monogramOnly }: WordmarkProps) {
  const triangle = (
    <span
      aria-hidden
      className="inline-block align-baseline"
      style={{
        width: size * 0.62,
        height: size * 0.62,
        // Equilateral triangle pointing up, in amber.
        clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        backgroundColor: "rgb(var(--amber))",
        transform: "translateY(1px)",
      }}
    />
  );

  if (monogramOnly) {
    return (
      <span
        className={cn("inline-grid place-items-center", className)}
        role="img"
        aria-label="CLEANPLATE"
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          backgroundColor: "rgb(var(--ink))",
        }}
      >
        <span
          aria-hidden
          className="inline-block"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
            backgroundColor: "rgb(var(--amber))",
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-display font-bold uppercase text-ink",
        className,
      )}
      style={{ fontSize: size, letterSpacing: "-0.03em" }}
      role="img"
      aria-label="CLEANPLATE"
    >
      <span aria-hidden>CLEANPL</span>
      {triangle}
      <span aria-hidden>TE</span>
    </span>
  );
}
