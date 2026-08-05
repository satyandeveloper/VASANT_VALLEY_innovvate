import type { Analysis } from "@/lib/types";
import { DISCLAIMER } from "@/lib/types";

/**
 * The share image — the only piece of this product that travels.
 *
 * It is seen by someone who did not ask for it, at roughly 300px wide in a
 * feed, so it has to work as a poster rather than as a document. The previous
 * version set four summary bullets at 24px: about 6px once a timeline scales
 * it down, which is noise wearing the shape of content.
 *
 * So the image is the contract itself — the real text at its real hostile
 * size, with the clauses this analysis actually cited highlighted at their
 * real offsets, and the verdict stamped beside it. Full size, that is legible
 * evidence. Thumbnail, it is a grey page with bright marks and a stamp, which
 * reads instantly as "document, marked up, judged".
 *
 * That is the risk in this design: most of its surface is text too small to
 * read in a feed. It earns that because the texture is the subject.
 */

const INK = "#24215c";
const INK_SOFT = "#565398";
const INK_FAINT = "#8b88b8";
const PAPER = "#eef0f7";
const OXBLOOD = "#8e2436";
const SAGE = "#3f7a5e";

const VERDICT: Record<string, { accent: string; label: string }> = {
  green: { accent: SAGE, label: "Looks fair" },
  amber: { accent: "#b98d12", label: "Read carefully" },
  red: { accent: OXBLOOD, label: "Serious flags" },
  not_legal: { accent: INK_FAINT, label: "Not a contract" },
};

/** The app's severity colours, at the alpha the results view marks clauses with. */
const SEVERITY_TINT: Record<string, string> = {
  high: "rgba(142,36,54,0.30)",
  medium: "rgba(240,198,74,0.72)",
  low: "rgba(110,91,184,0.24)",
};

type Segment = { text: string; tint?: string };

/**
 * Build a readable window of the document containing as many cited clauses as
 * will fit, and split it into plain and highlighted runs. Starting a little
 * before the first citation means the page opens mid-sentence the way a real
 * excerpt does, rather than always at the title.
 */
export function excerptSegments(analysis: Analysis, budget = 2600): Segment[] {
  const doc = analysis.docText ?? "";
  if (!doc) return [];

  const marks = [...analysis.flags]
    .filter((f) => f.end > f.start)
    .sort((a, b) => a.start - b.start);

  const first = marks[0]?.start ?? 0;
  const start = Math.max(0, first - 260);
  const end = Math.min(doc.length, start + budget);

  const segs: Segment[] = [];
  let cursor = start;
  for (const m of marks) {
    if (m.start >= end) break;
    if (m.end <= cursor) continue;
    const s = Math.max(m.start, cursor);
    const e = Math.min(m.end, end);
    if (s > cursor) segs.push({ text: doc.slice(cursor, s) });
    segs.push({ text: doc.slice(s, e), tint: SEVERITY_TINT[m.severity] ?? SEVERITY_TINT.medium });
    cursor = e;
  }
  if (cursor < end) segs.push({ text: doc.slice(cursor, end) });
  return segs;
}

/**
 * Satori is flexbox-only: `display: block` is rejected for a node with more
 * than one child, so `white-space: pre-wrap` is not available to hold the
 * document's paragraphing. Instead the runs are cut at line breaks and each
 * paragraph becomes its own wrapping row.
 */
export function excerptLines(analysis: Analysis): Segment[][] {
  const lines: Segment[][] = [[]];
  for (const seg of excerptSegments(analysis)) {
    const parts = seg.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, tint: seg.tint });
    });
  }
  return lines;
}

export function ShareImage({ analysis }: { analysis: Analysis }) {
  const v = VERDICT[analysis.verdict] ?? VERDICT.not_legal;
  const lines = excerptLines(analysis);
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of analysis.flags) counts[f.severity] += 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: PAPER,
        color: INK,
        fontFamily: "Archivo",
      }}
    >
      {/* Masthead — the only place the product names itself. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `4px solid ${INK}`,
          padding: "16px 40px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: 1 }}>
          I AGREE — THE FINE PRINT DECODER
        </div>
        <div style={{ fontSize: 20, color: INK_FAINT, fontFamily: "Courier" }}>
          {analysis.title.slice(0, 44)}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* The evidence: the document, marked where it was cited. */}
        <div
          style={{
            display: "flex",
            width: 620,
            padding: "22px 24px 0 40px",
            overflow: "hidden",
            borderRight: `2px solid ${INK_FAINT}`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Courier",
              fontSize: 13,
              lineHeight: 1.5,
              color: INK_SOFT,
            }}
          >
            {lines.map((line, i) => (
              <div key={i} style={{ display: "flex", flexWrap: "wrap", minHeight: 10 }}>
                {line.map((s, j) => (
                  <span
                    key={j}
                    style={{
                      backgroundColor: s.tint ?? "transparent",
                      color: s.tint ? INK : INK_SOFT,
                    }}
                  >
                    {s.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* The judgement. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "34px 40px",
            justifyContent: "center",
          }}
        >
          {/* Satori has no `double` border style, so the stamp's double rule is
              two nested boxes — which is what a double rule is. */}
          <div style={{ display: "flex", marginBottom: 22 }}>
            <div
              style={{
                display: "flex",
                border: `3px solid ${v.accent}`,
                padding: 3,
                transform: "rotate(-2.4deg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  border: `1px solid ${v.accent}`,
                  color: v.accent,
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: 2,
                  padding: "9px 20px",
                  textTransform: "uppercase",
                }}
              >
                {v.label}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.12, marginBottom: 18 }}>
            {analysis.headline.slice(0, 96)}
          </div>

          {analysis.verdict !== "not_legal" && (
            <div
              style={{
                display: "flex",
                fontFamily: "Courier",
                fontSize: 21,
                color: INK_FAINT,
                letterSpacing: 1,
              }}
            >
              {counts.high} high · {counts.medium} medium · {counts.low} low
            </div>
          )}
        </div>
      </div>

      {/* The differentiator sits where the eye lands last, next to the caveat
          it qualifies: this is checked, and it is still not legal advice. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 40px",
          borderTop: `4px solid ${INK}`,
          flexShrink: 0,
          fontFamily: "Courier",
          fontSize: 17,
        }}
      >
        <div style={{ display: "flex", color: SAGE, letterSpacing: 1 }}>
          EVERY WARNING QUOTES THE DOCUMENT VERBATIM
        </div>
        <div style={{ display: "flex", color: INK_FAINT, marginLeft: "auto" }}>{DISCLAIMER}</div>
      </div>
    </div>
  );
}

/**
 * Fonts, fetched once per instance. The image must never fail because a font
 * did not load, so every failure falls through to the system stack.
 */
let fontCache: { name: string; data: ArrayBuffer; weight: 400 | 800 }[] | null = null;

/**
 * Google serves woff2 to modern browsers, which satori cannot parse, and the
 * families' repository files are variable fonts, which its parser also rejects
 * (it throws on the axis table). Asking the CSS API with a legacy user-agent
 * returns a static TTF instance, which is the one thing that works.
 */
async function googleTtf(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`,
      { headers: { "User-Agent": "Mozilla/4.0" }, signal: AbortSignal.timeout(4000) }
    );
    if (!css.ok) return null;
    const url = (await css.text()).match(/https:\/\/[^)]+\.ttf/)?.[0];
    if (!url) return null;
    const font = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function shareFonts() {
  if (fontCache) return fontCache;
  const [archivo, courier] = await Promise.all([
    googleTtf("Archivo", 800),
    googleTtf("Courier+Prime", 400),
  ]);
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 800 }[] = [];
  if (archivo) fonts.push({ name: "Archivo", data: archivo, weight: 800 });
  if (courier) fonts.push({ name: "Courier", data: courier, weight: 400 });
  fontCache = fonts;
  return fonts;
}
