import {
  CATEGORIES,
  CATEGORY_LABELS,
  DISCLAIMER,
  type Category,
  type VerifiedFlag,
} from "./types";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

const CLEAN_LINES: Record<Category, string> = {
  data_sharing: "No hidden data-sharing found.",
  auto_renewal_cancellation: "No auto-renewal or cancellation traps found.",
  content_rights: "No grabs on your own content found.",
};

/**
 * Findings only — up to five, and fewer when there are fewer.
 *
 * This used to pad to exactly five by appending the document's length and the
 * verbatim-quote guarantee as extra bullets. They rendered identically to real
 * findings, so a document with three risks appeared to have five, and a fact
 * about the tool read as a fact about the contract. Both still appear in the
 * verdict card, each in a place that says what kind of thing it is.
 */
export function buildSummary(flags: VerifiedFlag[]): string[] {
  const sorted = [...flags].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  const bullets: string[] = sorted.slice(0, 5).map((f) => {
    const firstSentence = f.explanation.split(/(?<=[.!?])\s+/)[0] ?? f.explanation;
    return `${f.title} — ${firstSentence}`;
  });

  const flaggedCategories = new Set(flags.map((f) => f.category));
  for (const cat of CATEGORIES) {
    if (bullets.length >= 5) break;
    if (!flaggedCategories.has(cat)) bullets.push(CLEAN_LINES[cat]);
  }

  return bullets.slice(0, 5);
}

/** The one claim worth carrying wherever a summary is pasted. */
export const QUOTE_GUARANTEE =
  "Every warning here quotes the document word for word, checked against the source.";

export function copyText(headline: string, bullets: string[]): string {
  return [
    headline,
    "",
    ...bullets.map((b) => `• ${b}`),
    "",
    QUOTE_GUARANTEE,
    `— via I AGREE. ${DISCLAIMER}`,
  ].join("\n");
}

export { CATEGORY_LABELS };
