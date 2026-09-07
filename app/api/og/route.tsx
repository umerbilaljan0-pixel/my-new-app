import { ImageResponse } from "next/og";
import { lightColors } from "@/lib/design-tokens";

export const runtime = "edge";

/**
 * GET /api/og?title=…&subtitle=… — dynamic Open Graph image (Section 16).
 * Branded 1200×630 card generated per page for social sharing.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "CLEANPLATE").slice(0, 120);
  const subtitle = (searchParams.get("subtitle") || "Remove it. Rebuild it. Ship it.").slice(0, 120);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: lightColors.ink,
          color: "#FFFFFF",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: lightColors.amber, borderRadius: 8 }}>
            <div style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderBottom: `20px solid ${lightColors.ink}` }} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>CLEANPLATE</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 940 }}>{title}</div>
          <div style={{ fontSize: 30, color: "#9CA2AB" }}>{subtitle}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, color: lightColors.amber }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: lightColors.amber }} />
          Three tools. No signup. Results in seconds.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
