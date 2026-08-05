const SINGLE_CALL_LIMIT = 28_000;
const SECTION_SIZE = 24_000;
const OVERLAP = 1_000;

/**
 * Split long documents into overlapping sections cut at paragraph/sentence
 * boundaries. Overlap means clauses at a boundary appear whole in at least
 * one section; duplicates are removed later by offset-overlap dedupe.
 */
export function splitIntoSections(text: string): string[] {
  if (text.length <= SINGLE_CALL_LIMIT) return [text];

  const sections: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + SECTION_SIZE, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const para = window.lastIndexOf("\n\n");
      const sentence = window.lastIndexOf(". ");
      const cut = para > SECTION_SIZE / 2 ? para : sentence > SECTION_SIZE / 2 ? sentence + 1 : -1;
      if (cut !== -1) end = start + cut;
    }
    sections.push(text.slice(start, end));
    if (end >= text.length) break;
    start = Math.max(end - OVERLAP, start + 1);
  }
  return sections;
}

/** Run tasks with bounded concurrency. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
