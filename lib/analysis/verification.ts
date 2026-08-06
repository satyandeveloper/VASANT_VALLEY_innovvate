/**
 * The verification layer: every model quote is confirmed to exist in the
 * source text (tolerating only whitespace/punctuation/quote-style differences)
 * and mapped back to offsets in the ORIGINAL text for highlighting.
 * Anything unconfirmed is never displayed as evidence.
 */

const CHAR_TABLE: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "–": "-",
  "—": "-",
  "…": "...",
  " ": " ",
};

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

export interface NormDoc {
  norm: string;
  /** map[i] = index in the original text of the char that produced norm[i] */
  map: number[];
}

/** Normalise text while recording, per output char, its source index. */
export function normalizeWithMap(original: string): NormDoc {
  const chars: string[] = [];
  const map: number[] = [];
  let lastWasSpace = true; // swallows leading whitespace
  for (let i = 0; i < original.length; i++) {
    let c = original[i];
    c = CHAR_TABLE[c] ?? c;
    c = c.normalize("NFKC");
    // CHAR_TABLE can expand one char to several (e.g. ellipsis); treat each
    for (const piece of c) {
      if (/\s/.test(piece)) {
        if (!lastWasSpace) {
          chars.push(" ");
          map.push(i);
          lastWasSpace = true;
        }
        continue;
      }
      if (!LETTER_OR_DIGIT.test(piece)) continue; // drop punctuation
      chars.push(piece.toLowerCase());
      map.push(i);
      lastWasSpace = false;
    }
  }
  // trim a trailing space
  if (chars.length && chars[chars.length - 1] === " ") {
    chars.pop();
    map.pop();
  }
  return { norm: chars.join(""), map };
}

function normalizeQuote(quote: string): string {
  return normalizeWithMap(quote).norm;
}

export interface MatchResult {
  verified: boolean;
  start: number;
  end: number;
  exactQuote: string;
}

const NO_MATCH: MatchResult = { verified: false, start: 0, end: 0, exactQuote: "" };

function offsetsFor(
  doc: NormDoc,
  original: string,
  idx: number,
  len: number
): MatchResult {
  const start = doc.map[idx];
  let end = doc.map[idx + len - 1] + 1;
  // extend over trailing punctuation/closing quotes so highlights look natural
  while (end < original.length && /[.,;:!?)"'’”\]]/.test(original[end])) {
    end++;
  }
  return { verified: true, start, end, exactQuote: original.slice(start, end) };
}

/**
 * Words whose removal reverses what a clause means.
 *
 * The trimmed-core rung below exists because models clip a word off the ends
 * of a quote. The danger is that the clipped-off part is exactly what carries
 * the meaning: "you do NOT grant a perpetual licence" trimmed at the front
 * matches "grant a perpetual licence" in the document, and a fabricated clause
 * is then reported as found. The displayed text is still the document's own
 * words — pipeline.ts substitutes the real slice — but the finding would have
 * been let through on evidence that says the opposite of the model's claim.
 */
const MEANING_REVERSING = new Set([
  "no",
  "not",
  "nor",
  "never",
  "neither",
  "cannot",
  "cant",
  "wont",
  "without",
  "unless",
  "except",
  "excluding",
  "prohibited",
]);

/**
 * Trim a whole word or two off each end of a normalised quote.
 *
 * Two rules make this safe where a blind `slice(10, -10)` was not: the cut
 * lands on word boundaries, so a word is never half-matched, and the trim is
 * abandoned entirely if it would discard a meaning-reversing word.
 *
 * Returns null when no safe core of usable length exists.
 */
function safeTrimmedCore(normalizedQuote: string): string | null {
  const words = normalizedQuote.split(" ").filter(Boolean);
  if (words.length < 6) return null;

  const MIN_TRIM_CHARS = 10;
  let lead = 0;
  for (let dropped = 0; lead < words.length && dropped < MIN_TRIM_CHARS; lead++) {
    dropped += words[lead].length + 1;
  }
  let tail = 0;
  for (let dropped = 0; tail < words.length - lead && dropped < MIN_TRIM_CHARS; tail++) {
    dropped += words[words.length - 1 - tail].length + 1;
  }

  const discarded = [...words.slice(0, lead), ...words.slice(words.length - tail)];
  if (discarded.some((w) => MEANING_REVERSING.has(w))) return null;

  const core = words.slice(lead, words.length - tail).join(" ");
  return core.length >= 40 ? core : null;
}

/**
 * Find a model quote in the original document. Returns original-text offsets.
 * Retry ladder: exact normalised match → safely trimmed core (models sometimes
 * add a leading ellipsis or clip a word) → longest sentence alone.
 *
 * Each rung is more forgiving than the last, so each is a place a false
 * positive could enter. The ladder stops at whole words and whole sentences
 * for that reason: it will re-find a quote the model reformatted, and it will
 * not assemble one the document never contained.
 */
export function findQuoteInOriginal(
  quote: string,
  doc: NormDoc,
  original: string
): MatchResult {
  const q = normalizeQuote(quote);
  if (q.length < 10) return NO_MATCH; // too short to be meaningful evidence

  let idx = doc.norm.indexOf(q);
  if (idx !== -1) return offsetsFor(doc, original, idx, q.length);

  const core = safeTrimmedCore(q);
  if (core) {
    idx = doc.norm.indexOf(core);
    if (idx !== -1) return offsetsFor(doc, original, idx, core.length);
  }

  // longest sentence alone
  const sentences = quote
    .split(/(?<=[.!?])\s+/)
    .map((s) => normalizeQuote(s))
    .filter((s) => s.length >= 30)
    .sort((a, b) => b.length - a.length);
  for (const s of sentences) {
    idx = doc.norm.indexOf(s);
    if (idx !== -1) return offsetsFor(doc, original, idx, s.length);
  }

  return NO_MATCH;
}
