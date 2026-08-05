"use client";

import { useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Analysis,
  type Severity,
  type VerifiedFlag,
} from "@/lib/types";

/**
 * Severity is carried by a margin rule, the way a reviewer marks a contract —
 * not by a coloured pill. The quote is set in the typewriter face because it is
 * the document's own words; the explanation is in the body serif because that
 * is the app speaking.
 */
// Left edge only — `border-oxblood` would recolour all four sides and fight
// the `border-rule` outline.
const SEVERITY_RULE: Record<Severity, string> = {
  high: "border-l-oxblood",
  medium: "border-l-canary-deep",
  low: "border-l-ditto",
};

const SEVERITY_TEXT: Record<Severity, string> = {
  high: "text-oxblood",
  medium: "text-canary-deep",
  low: "text-ditto",
};

function FlagCard({
  flag,
  index,
  onSelect,
}: {
  flag: VerifiedFlag;
  index: number;
  onSelect: (index: number) => void;
}) {
  return (
    <button
      onClick={() => onSelect(index)}
      className={`w-full border border-rule border-l-4 bg-white p-4 text-left transition-colors hover:bg-canary/10 ${SEVERITY_RULE[flag.severity]}`}
    >
      <div className="mb-1.5 flex items-baseline gap-2.5">
        <span className={`field-label ${SEVERITY_TEXT[flag.severity]}`}>{flag.severity}</span>
        <span className="font-display text-[15px] font-bold leading-snug text-ink">
          {flag.title}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-soft">{flag.explanation}</p>
      <blockquote className="mt-2.5 border-l-2 border-rule pl-3 font-type text-[11px] leading-relaxed text-ink">
        {flag.quote.length > 220 ? flag.quote.slice(0, 220) + "…" : flag.quote}
      </blockquote>
      <p className="field-label mt-2">Show me this clause →</p>
    </button>
  );
}

export function FlagList({
  analysis,
  onSelectFlag,
}: {
  analysis: Analysis;
  onSelectFlag: (index: number) => void;
}) {
  const [showUnverified, setShowUnverified] = useState(false);

  return (
    <div className="space-y-6">
      {CATEGORIES.map((cat) => {
        const catFlags = analysis.flags
          .map((f, i) => ({ flag: f, index: i }))
          .filter(({ flag }) => flag.category === cat);
        return (
          <div key={cat}>
            <h3 className="mb-2.5 flex items-baseline gap-2.5 border-b border-ink pb-1.5">
              <span className="field-label text-ink">{CATEGORY_LABELS[cat]}</span>
              {catFlags.length === 0 && (
                <span className="field-label text-sage">Clean</span>
              )}
            </h3>
            {catFlags.length > 0 && (
              <div className="space-y-2.5">
                {catFlags.map(({ flag, index }) => (
                  <FlagCard key={index} flag={flag} index={index} onSelect={onSelectFlag} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* The pink copy: the one that needs a second pair of eyes. */}
      {analysis.unverified.length > 0 && (
        <div className="border border-dashed border-rose bg-rose/8 p-4">
          <button
            onClick={() => setShowUnverified((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="field-label text-ink">
              Needs human review ({analysis.unverified.length}) — no verbatim match
            </span>
            <span className="font-type text-xs text-ink-soft">
              {showUnverified ? "−" : "+"}
            </span>
          </button>
          {showUnverified && (
            <ul className="mt-3 space-y-2.5">
              {analysis.unverified.map((f, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink-soft">
                  <span className={`field-label mr-2 ${SEVERITY_TEXT[f.severity]}`}>
                    {f.severity}
                  </span>
                  <span className="font-semibold text-ink">{f.title}</span> — {f.explanation}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
