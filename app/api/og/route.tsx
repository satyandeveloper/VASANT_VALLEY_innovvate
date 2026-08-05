import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getById } from "@/lib/pipeline";
import { DISCLAIMER } from "@/lib/types";

export const runtime = "nodejs";

// Carbon-copy palette, matching globals.css. The share image is the artifact
// that travels, so it carries the same ink as the app.
const INK = "#24215c";
const PAPER = "#eef0f7";
const FAINT = "#8b88b8";

const VERDICT_STYLES: Record<string, { accent: string; label: string }> = {
  green: { accent: "#3f7a5e", label: "Looks fair" },
  amber: { accent: "#b98d12", label: "Read carefully" },
  red: { accent: "#8e2436", label: "Serious flags" },
  not_legal: { accent: "#8b88b8", label: "Not a contract" },
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const analysis = id ? await getById(id) : null;
  if (!analysis) {
    return new Response("Not found", { status: 404 });
  }
  const style = VERDICT_STYLES[analysis.verdict] ?? VERDICT_STYLES.not_legal;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `4px solid ${INK}`,
            padding: "22px 48px",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>
            I AGREE — THE FINE PRINT DECODER
          </div>
          <div style={{ fontSize: 22, color: FAINT, letterSpacing: 2 }}>
            {analysis.title.slice(0, 48).toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "40px 48px", flex: 1 }}>
          {/* The stamp, rendered as a double-ruled box. */}
          <div style={{ display: "flex", marginBottom: 26 }}>
            <div
              style={{
                display: "flex",
                border: `5px double ${style.accent}`,
                color: style.accent,
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: 3,
                padding: "10px 26px",
                textTransform: "uppercase",
              }}
            >
              {style.label}
            </div>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, marginBottom: 26, lineHeight: 1.15 }}>
            {analysis.headline.slice(0, 110)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {analysis.summaryBullets.slice(0, 4).map((b, i) => (
              <div key={i} style={{ display: "flex", fontSize: 24, color: INK }}>
                <span style={{ color: style.accent, marginRight: 14 }}>■</span>
                <span>{b.slice(0, 95)}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            padding: "16px 48px",
            fontSize: 19,
            color: FAINT,
            letterSpacing: 1,
            borderTop: `4px solid ${INK}`,
          }}
        >
          {DISCLAIMER}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
