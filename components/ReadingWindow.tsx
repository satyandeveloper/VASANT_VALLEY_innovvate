"use client";

import { useEffect, useRef, useState } from "react";

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
 */

const LINE_HEIGHT = 18;
// Sized so the window stands in for the textarea it replaces without the
// surrounding layout shifting.
const VISIBLE_LINES = 10;

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
  const [offset, setOffset] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    // Paced at roughly a line a beat: fast enough to read as scanning, slow
    // enough that the words are legible rather than a blur.
    const t = setInterval(() => setOffset((o) => o + 1), 260);
    return () => clearInterval(t);
  }, []);

  const total = wrapRef.current?.scrollHeight ?? 0;
  const max = Math.max(0, total - VISIBLE_LINES * LINE_HEIGHT);
  const y = max > 0 ? -((offset * LINE_HEIGHT) % (max + LINE_HEIGHT)) : 0;

  return (
    <div className="mt-4 border border-rule bg-white">
      {/* The single place status is reported. The field above already names
          this box "The document"; repeating that here would be a label doing
          a second job. */}
      <div className="border-b border-rule px-3 py-1.5">
        <span className="field-label text-ditto">
          {step}/{steps} · {phase}
        </span>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          height: VISIBLE_LINES * LINE_HEIGHT,
          maskImage:
            "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
        }}
        aria-hidden="true"
      >
        <div
          ref={wrapRef}
          className="whitespace-pre-wrap px-3 font-type text-[11px] text-ink-soft transition-transform duration-500 ease-linear"
          style={{ lineHeight: `${LINE_HEIGHT}px`, transform: `translateY(${y}px)` }}
        >
          {text}
        </div>

        {/* The scan rule: one moving element, sitting on the line being read. */}
        <div
          className="pointer-events-none absolute inset-x-0 bg-canary/45"
          style={{ top: (VISIBLE_LINES / 2) * LINE_HEIGHT, height: LINE_HEIGHT }}
        />
      </div>

      {/* The window is decorative; the status is what gets announced. */}
      <p className="sr-only" role="status" aria-live="polite">
        {phase}
      </p>
    </div>
  );
}
