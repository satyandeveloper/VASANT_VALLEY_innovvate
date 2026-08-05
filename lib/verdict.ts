import type { Verdict, VerifiedFlag } from "./types";

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
