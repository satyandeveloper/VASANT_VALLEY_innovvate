import { readFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import type { Analysis } from "@/lib/types";
import { DISCLAIMER } from "@/lib/types";
import { QUOTE_GUARANTEE_SHORT } from "@/lib/summary";
import { INK, INK_FAINT, INK_SOFT, PAPER, SAGE } from "@/lib/palette";
import { severityCounts, VERDICT_PRESENTATION } from "@/lib/verdict";

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



/**
 * Deliberately stronger than the marks in the results view (globals.css uses
 * 22/62/18%). The image is read at thumbnail size, where a 22% tint disappears
 * — the marks have to survive being scaled to a third of their size.
 */
const SEVERITY_TINT: Record<string, string> = {
  high: "rgba(142,36,54,0.30)",
  medium: "rgba(240,198,74,0.72)",
  low: "rgba(110,91,184,0.24)",
};

type Segment = { text: string; tint?: string };

/** How much of the document the left column can hold before it clips. */
const EXCERPT_BUDGET = 2600;

/**
 * Build a readable window of the document containing as many cited clauses as
 * will fit, and split it into plain and highlighted runs. Starting a little
 * before the first citation means the page opens mid-sentence the way a real
 * excerpt does, rather than always at the title.
 */
function excerptSegments(analysis: Analysis): Segment[] {
  const doc = analysis.docText ?? "";
  if (!doc) return [];

  const marks = [...analysis.flags]
    .filter((f) => f.end > f.start)
    .sort((a, b) => a.start - b.start);

  const first = marks[0]?.start ?? 0;
  const start = Math.max(0, first - 260);
  const end = Math.min(doc.length, start + EXCERPT_BUDGET);

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
function excerptLines(analysis: Analysis): Segment[][] {
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
  const v = VERDICT_PRESENTATION[analysis.verdict] ?? VERDICT_PRESENTATION.not_legal;
  const lines = excerptLines(analysis);
  const counts = severityCounts(analysis.flags);

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
                border: `3px solid ${v.hex}`,
                padding: 3,
                transform: "rotate(-2.4deg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  border: `1px solid ${v.hex}`,
                  color: v.hex,
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
          {QUOTE_GUARANTEE_SHORT}
        </div>
        <div style={{ display: "flex", color: INK_FAINT, marginLeft: "auto" }}>{DISCLAIMER}</div>
      </div>
    </div>
  );
}

/**
 * Fonts, vendored and read from disk at module load.
 *
 * These were previously fetched per instance from Google's CSS API with a
 * legacy user-agent — the only way to get a static TTF, since satori cannot
 * parse woff2 and throws on the axis table of a variable font. That put three
 * things outside this repo on the request path, and a single timeout cached an
 * empty result for the life of the instance, silently rendering every later
 * image in the wrong face. The bytes are 180KB; keeping them here is cheaper
 * than any of that.
 */
const FONTS = [
  { name: "Archivo", file: "Archivo-ExtraBold.ttf", weight: 800 as const },
  { name: "Courier", file: "CourierPrime-Regular.ttf", weight: 400 as const },
].map((f) => ({
  name: f.name,
  weight: f.weight,
  // `new URL(..., import.meta.url)` is the form Next's file tracing follows, so
  // the fonts are bundled into the serverless function.
  data: readFileSync(new URL(`./fonts/${f.file}`, import.meta.url)),
}));

/**
 * Render the image. Owning the options here means callers — the route and the
 * preview script — cannot disagree about size or fonts.
 */
export function renderShareImage(analysis: Analysis) {
  return new ImageResponse(<ShareImage analysis={analysis} />, {
    width: 1200,
    height: 630,
    fonts: FONTS,
    // The content is immutable for a given id, and re-rendering it costs a full
    // text shaping pass. Without this next/og sends must-revalidate.
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
}
