"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/types";
import { severityCounts } from "@/lib/verdict";
import { copyText } from "@/lib/summary";

/**
 * The verdict is delivered as a rubber stamp — the visual language of a
 * document that has been adjudicated. Colour comes from the carbon-copy set,
 * so red is an inky oxblood rather than a warning-light red.
 */
const VERDICT_STYLES: Record<
  Analysis["verdict"],
  { color: string; stamp: string; note: string }
> = {
  green: { color: "text-sage", stamp: "Looks fair", note: "Nothing here should surprise you." },
  amber: {
    color: "text-canary-deep",
    stamp: "Read carefully",
    note: "Some terms are worth knowing before you agree.",
  },
  red: {
    color: "text-oxblood",
    stamp: "Serious flags",
    note: "This document takes more than you'd expect.",
  },
  not_legal: {
    color: "text-ink-faint",
    stamp: "Not a contract",
    note: "This doesn't read like a terms document.",
  },
};

export function VerdictCard({ analysis }: { analysis: Analysis }) {
  const [copied, setCopied] = useState(false);
  const style = VERDICT_STYLES[analysis.verdict];
  const counts = severityCounts(analysis.flags);

  async function onCopy() {
    await navigator.clipboard.writeText(copyText(analysis.headline, analysis.summaryBullets));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="border-2 border-ink bg-white">
      <div className="flex flex-col gap-5 border-b border-rule p-5 sm:flex-row sm:items-start sm:gap-7">
        <div className={`shrink-0 ${style.color}`}>
          <span className="stamp text-base sm:text-lg">{style.stamp}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="field-label mb-1.5 truncate">{analysis.title}</p>
          <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">
            {analysis.headline}
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">{style.note}</p>
          {analysis.verdict !== "not_legal" && (
            <p className="field-label mt-3">
              {counts.high} high · {counts.medium} medium · {counts.low} low
            </p>
          )}
        </div>
      </div>

      <ul className="divide-y divide-rule">
        {analysis.summaryBullets.map((b, i) => (
          <li key={i} className="flex gap-3.5 px-5 py-3">
            <span className={`mt-1 shrink-0 text-xs ${style.color}`}>■</span>
            <span className="text-[15px] leading-relaxed text-ink">{b}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-rule px-5 py-3.5">
        <button
          onClick={onCopy}
          className="field-label border border-ink px-3 py-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          {copied ? "Copied" : "Copy summary"}
        </button>
        {analysis.id && (
          <a
            href={`/api/og?id=${analysis.id}`}
            download="i-agree-verdict.png"
            className="field-label border border-ink px-3 py-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Save as image
          </a>
        )}
        {analysis.cached && (
          <span className="field-label ml-auto">Recognised — served from the registry</span>
        )}
      </div>
    </section>
  );
}
