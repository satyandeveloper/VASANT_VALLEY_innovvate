import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getById } from "@/lib/pipeline";
import { DISCLAIMER } from "@/lib/types";

export const runtime = "nodejs";

const VERDICT_STYLES: Record<string, { bg: string; label: string }> = {
  green: { bg: "#16a34a", label: "GREEN — looks fair" },
  amber: { bg: "#d97706", label: "AMBER — read carefully" },
  red: { bg: "#dc2626", label: "RED — serious flags" },
  not_legal: { bg: "#475569", label: "NOT A TERMS DOCUMENT" },
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
          backgroundColor: "#0f172a",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: style.bg,
            padding: "24px 48px",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 700 }}>{style.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>I AGREE — Fine Print Decoder</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "36px 48px", flex: 1 }}>
          <div style={{ fontSize: 30, color: "#94a3b8", marginBottom: 8 }}>
            {analysis.title.slice(0, 70)}
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 28, lineHeight: 1.2 }}>
            {analysis.headline.slice(0, 110)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {analysis.summaryBullets.slice(0, 5).map((b, i) => (
              <div key={i} style={{ display: "flex", fontSize: 24, color: "#e2e8f0" }}>
                <span style={{ color: style.bg, marginRight: 14 }}>●</span>
                <span>{b.slice(0, 95)}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            padding: "18px 48px",
            fontSize: 20,
            color: "#94a3b8",
            borderTop: "1px solid #1e293b",
          }}
        >
          {DISCLAIMER}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
