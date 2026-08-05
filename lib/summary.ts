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

/** Exactly five bullets, built from the top verified flags. */
export function buildSummary(flags: VerifiedFlag[], docChars: number): string[] {
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

  while (bullets.length < 5) {
    bullets.push(
      bullets.length === 4
        ? "Every warning above is backed by an exact quote from the document."
        : `Document length: ${docChars.toLocaleString()} characters, checked across ${CATEGORIES.length} risk categories.`
    );
  }
  return bullets.slice(0, 5);
}

export function copyText(headline: string, bullets: string[]): string {
  return [headline, "", ...bullets.map((b) => `• ${b}`), "", `— via I AGREE. ${DISCLAIMER}`].join(
    "\n"
  );
}

export { CATEGORY_LABELS };
