import type { Verdict, VerifiedFlag } from "./types";
import { CANARY_DEEP, INK_FAINT, OXBLOOD, SAGE } from "./palette";

/**
 * Deterministic grade — computed only from VERIFIED flags, so nothing
 * unproven ever counts as evidence. Identical input → identical result.
 */
export function computeVerdict(flags: VerifiedFlag[]): Exclude<Verdict, "not_legal"> {
  const highs = flags.filter((f) => f.severity === "high");
  const highCategories = new Set(highs.map((f) => f.category));
  const mediums = flags.filter((f) => f.severity === "medium");
  if (highs.length >= 2 || highCategories.size > 1) return "red";
  if (highs.length === 1 || mediums.length >= 3) return "amber";
  return "green";
}

export function headlineFor(
  verdict: Verdict,
  flags: VerifiedFlag[],
  title: string
): string {
  const highs = flags.filter((f) => f.severity === "high").length;
  const total = flags.length;
  switch (verdict) {
    case "red":
      return `${highs} serious red flag${highs === 1 ? "" : "s"} — read before you agree.`;
    case "amber":
      return `Some things worth knowing before you agree (${total} flag${total === 1 ? "" : "s"} found).`;
    case "green":
      return total === 0
        ? "No serious traps found in this document."
        : `Mostly fair — ${total} minor thing${total === 1 ? "" : "s"} worth knowing.`;
    case "not_legal":
      return `This doesn't look like a terms document${title ? ` (${title})` : ""}.`;
  }
}

export function severityCounts(flags: VerifiedFlag[]) {
  return {
    high: flags.filter((f) => f.severity === "high").length,
    medium: flags.filter((f) => f.severity === "medium").length,
    low: flags.filter((f) => f.severity === "low").length,
  };
}

/**
 * How each verdict is presented, in one place.
 *
 * This was previously written out in four modules — the verdict card, the
 * registry list, the history list and the share image — so renaming a stamp or
 * retuning a colour meant four coordinated edits, and a miss showed up as the
 * share image disagreeing with the card the reader was looking at. Keyed by
 * `Verdict` so adding a member fails to compile rather than falling through to
 * a default.
 */
export const VERDICT_PRESENTATION: Record<
  Verdict,
  { label: string; note: string; hex: string; textClass: string; dotClass: string }
> = {
  green: {
    label: "Looks fair",
    note: "Nothing here should surprise you.",
    hex: SAGE,
    textClass: "text-sage",
    dotClass: "bg-sage",
  },
  amber: {
    label: "Read carefully",
    note: "Some terms are worth knowing before you agree.",
    hex: CANARY_DEEP,
    textClass: "text-canary-deep",
    dotClass: "bg-canary-deep",
  },
  red: {
    label: "Serious flags",
    note: "This document takes more than you'd expect.",
    hex: OXBLOOD,
    textClass: "text-oxblood",
    dotClass: "bg-oxblood",
  },
  not_legal: {
    label: "Not a contract",
    note: "This doesn't read like a terms document.",
    hex: INK_FAINT,
    textClass: "text-ink-faint",
    dotClass: "bg-ink-faint",
  },
};
