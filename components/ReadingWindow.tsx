/**
 * The wait, made honest.
 *
 * Analysis takes six to ten seconds — the longest single moment in the
 * product, and the one that used to be a pulsing line of text. Rather than a
 * spinner or a shimmering skeleton standing in for content that does not exist
 * yet, this shows the document the reader actually pasted, scrolling past in
 * the typewriter face the app uses for the document's own words, with a rule
 * tracking down it.
 *
 * It is the product's claim, demonstrated instead of asserted: every line gets
 * read. It also rhymes with the hero, which is a wall of the same material.
 *
 * Nothing here fakes precision. There is no percentage and no estimate. The
 * phases are named because they genuinely happen in that order — read, scan,
 * verify — and the scroll is paced to look like reading, not to imply progress
 * it cannot measure.
 *
 * The motion is a CSS animation rather than a timer driving state. An earlier
 * version ticked every 260ms and re-rendered the whole subtree to increment an
 * integer, and read `scrollHeight` during render to size the scroll — an impure
 * render that returned 0 on first paint. The keyframe translates by `-100%` of
 * the element's own height instead, so nothing needs measuring, and
 * `prefers-reduced-motion` is handled in CSS where it belongs.
 */

const WINDOW_HEIGHT = 180;

/**
 * A paste can be 200,000 characters (MAX_CHARS). Only a few hundred lines ever
 * scroll past in ten seconds, so putting the whole document in the DOM lays out
 * tens of thousands of pixels inside a 180px clipped box for the entire wait.
 */
const VISIBLE_BUDGET = 6000;

/** Long documents should not scroll faster, so pace by length and clamp. */
function scanSeconds(chars: number) {
  return Math.min(45, Math.max(12, chars / 90));
}

export function ReadingWindow({
  text,
  phase,
  step,
  steps,
}: {
  text: string;
  phase: string;
  step: number;
  steps: number;
}) {
  const excerpt = text.length > VISIBLE_BUDGET ? text.slice(0, VISIBLE_BUDGET) : text;

  return (
    <div className="border border-rule bg-white">
      {/* The single place status is reported. The field above already names
          this box "The document"; repeating that here would be a label doing
          a second job. */}
      <div className="border-b border-rule px-3 py-1.5">
        <span className="field-label text-ditto">
          {step}/{steps} · {phase}
        </span>
      </div>

      <div
        className="reading-window relative overflow-hidden"
        style={{ height: WINDOW_HEIGHT }}
        aria-hidden="true"
      >
        <div
          className="reading-scan whitespace-pre-wrap px-3 font-type text-[11px] text-ink-soft"
          style={{ lineHeight: "18px", animationDuration: `${scanSeconds(excerpt.length)}s` }}
        >
          {excerpt}
        </div>

        {/* The scan rule: one moving element, sitting on the line being read. */}
        <div className="pointer-events-none absolute inset-x-0 top-[81px] h-[18px] bg-canary/45" />
      </div>

      {/* The window is decorative; the status is what gets announced. */}
      <p className="sr-only" role="status" aria-live="polite">
        {phase}
      </p>
    </div>
  );
}
