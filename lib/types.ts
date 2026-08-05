export const CATEGORIES = [
  "data_sharing",
  "auto_renewal_cancellation",
  "content_rights",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Severity = "high" | "medium" | "low";
export type Verdict = "green" | "amber" | "red" | "not_legal";

export const CATEGORY_LABELS: Record<Category, string> = {
  data_sharing: "Data sharing",
  auto_renewal_cancellation: "Auto-renewal & cancellation",
  content_rights: "Rights over your content",
};

/** A flag as returned by the model, before verification. */
export interface RawFlag {
  category: Category;
  severity: Severity;
  title: string;
  explanation: string;
  quote: string;
}

/** Result of one model call over one section. */
export interface SectionResult {
  is_legal_document: boolean;
  document_type: string;
  suggested_title: string;
  flags: RawFlag[];
}

/** A flag whose quote was confirmed verbatim in the source document. */
export interface VerifiedFlag {
  category: Category;
  severity: Severity;
  title: string;
  explanation: string;
  quote: string;
  start: number;
  end: number;
}

/** A flag whose quote could not be confirmed — shown without evidence. */
export interface UnverifiedFlag {
  category: Category;
  severity: Severity;
  title: string;
  explanation: string;
}

export interface Analysis {
  id: string | null;
  title: string;
  sourceType: "paste" | "url" | "sample";
  sourceUrl: string | null;
  docText: string;
  verdict: Verdict;
  headline: string;
  summaryBullets: string[];
  flags: VerifiedFlag[];
  unverified: UnverifiedFlag[];
  cached: boolean;
  createdAt: string;
}

export const DISCLAIMER =
  "This tool explains text; it does not replace legal advice.";

export const MIN_CHARS = 300;
export const MAX_CHARS = 200_000;
