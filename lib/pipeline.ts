import { analyzeSection, MODEL } from "./openai";
import { fingerprint } from "./fingerprint";
import { splitIntoSections, mapWithConcurrency } from "./sectioning";
import { normalizeWithMap, findQuoteInOriginal } from "./verification";
import { computeVerdict, headlineFor } from "./verdict";
import { buildSummary } from "./summary";
import { supabase } from "./supabase";
import type {
  Analysis,
  RawFlag,
  SectionResult,
  UnverifiedFlag,
  VerifiedFlag,
} from "./types";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export interface AnalyzeInput {
  text: string;
  sourceType: "paste" | "url" | "sample";
  sourceUrl?: string | null;
  titleHint?: string | null;
  userId?: string | null;
}

interface DbRow {
  id: string;
  title: string;
  source_type: Analysis["sourceType"];
  source_url: string | null;
  doc_text: string;
  verdict: Analysis["verdict"];
  headline: string;
  summary_bullets: string[];
  flags: VerifiedFlag[];
  unverified: UnverifiedFlag[];
  created_at: string;
}

export function rowToAnalysis(row: DbRow, cached: boolean): Analysis {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    docText: row.doc_text,
    verdict: row.verdict,
    headline: row.headline,
    summaryBullets: row.summary_bullets,
    flags: row.flags,
    unverified: row.unverified,
    cached,
    createdAt: row.created_at,
  };
}

export async function getCached(text: string): Promise<Analysis | null> {
  const db = supabase();
  if (!db) return null;
  try {
    const { data } = await db
      .from("analyses")
      .select("*")
      .eq("fingerprint", fingerprint(text))
      .maybeSingle();
    return data ? rowToAnalysis(data as DbRow, true) : null;
  } catch {
    return null; // cache read failure → fall through to live analysis
  }
}

export async function getById(id: string): Promise<Analysis | null> {
  const db = supabase();
  if (!db) return null;
  const { data } = await db.from("analyses").select("*").eq("id", id).maybeSingle();
  return data ? rowToAnalysis(data as DbRow, true) : null;
}

export async function recordHistory(userId: string, analysisId: string) {
  const db = supabase();
  if (!db) return;
  try {
    await db
      .from("user_history")
      .upsert(
        { user_id: userId, analysis_id: analysisId },
        { onConflict: "user_id,analysis_id", ignoreDuplicates: true }
      );
  } catch {
    // history is best-effort
  }
}

/** Dedupe verified flags: same category + >50% offset overlap, or identical span. */
function dedupeVerified(flags: VerifiedFlag[]): VerifiedFlag[] {
  const kept: VerifiedFlag[] = [];
  for (const f of flags) {
    const dup = kept.find((k) => {
      if (k.category !== f.category) return false;
      const overlap = Math.min(k.end, f.end) - Math.max(k.start, f.start);
      const shorter = Math.min(k.end - k.start, f.end - f.start);
      return overlap > 0 && overlap / shorter > 0.5;
    });
    if (!dup) {
      kept.push(f);
    } else if (SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[dup.severity]) {
      kept[kept.indexOf(dup)] = f;
    }
  }
  return kept;
}

function dedupeUnverified(flags: UnverifiedFlag[]): UnverifiedFlag[] {
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.category}|${f.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Full pipeline: section → analyse → verify → merge → verdict → store. */
export async function runAnalysis(input: AnalyzeInput): Promise<Analysis> {
  const { text } = input;
  const sections = splitIntoSections(text);

  const results: SectionResult[] = await mapWithConcurrency(sections, 4, (s) =>
    analyzeSection(s)
  );

  const isLegal = results.some((r) => r.is_legal_document);
  const title =
    input.titleHint?.trim() ||
    results.find((r) => r.suggested_title)?.suggested_title ||
    "Untitled document";

  let verdict: Analysis["verdict"];
  let flags: VerifiedFlag[] = [];
  let unverified: UnverifiedFlag[] = [];
  let headline: string;
  let bullets: string[];

  if (!isLegal) {
    verdict = "not_legal";
    headline = headlineFor("not_legal", [], "");
    bullets = [
      "This text doesn't look like a terms of service, policy, or agreement.",
      "No risk analysis was run, so there are no flags to show.",
      "Try pasting the full legal document you were asked to accept.",
      "The URL tab can pull a terms page directly from a link.",
      "Every warning we do show is backed by an exact quote from the source.",
    ];
  } else {
    // Verify every quote from every section against the FULL original text,
    // so offsets are always in original-document coordinates.
    const doc = normalizeWithMap(text);
    const rawFlags: RawFlag[] = results.flatMap((r) => r.flags);
    for (const f of rawFlags) {
      const match = findQuoteInOriginal(f.quote, doc, text);
      if (match.verified) {
        flags.push({ ...f, quote: match.exactQuote, start: match.start, end: match.end });
      } else {
        unverified.push({
          category: f.category,
          severity: f.severity,
          title: f.title,
          explanation: f.explanation,
        });
      }
    }
    flags = dedupeVerified(flags).sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.start - b.start
    );
    unverified = dedupeUnverified(unverified);
    verdict = computeVerdict(flags);
    headline = headlineFor(verdict, flags, title);
    bullets = buildSummary(flags, text.length);
  }

  const analysis: Analysis = {
    id: null,
    title,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl ?? null,
    docText: text,
    verdict,
    headline,
    summaryBullets: bullets,
    flags,
    unverified,
    cached: false,
    createdAt: new Date().toISOString(),
  };

  // Store (best-effort — a DB hiccup must not lose the analysis)
  const db = supabase();
  if (db) {
    try {
      const { data } = await db
        .from("analyses")
        .upsert(
          {
            fingerprint: fingerprint(text),
            title,
            source_type: input.sourceType,
            source_url: input.sourceUrl ?? null,
            doc_text: text,
            doc_chars: text.length,
            verdict,
            headline,
            summary_bullets: bullets,
            flags,
            unverified,
            is_sample: input.sourceType === "sample",
            model: MODEL,
          },
          { onConflict: "fingerprint" }
        )
        .select("id")
        .single();
      if (data?.id) analysis.id = data.id;
    } catch {
      // render from response payload; registry/history skip silently
    }
  }

  if (analysis.id && input.userId) {
    await recordHistory(input.userId, analysis.id);
  }

  return analysis;
}
