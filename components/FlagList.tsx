"use client";

import { useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Analysis,
  type Severity,
  type VerifiedFlag,
} from "@/lib/types";

const SEVERITY_BADGE: Record<Severity, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
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
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-400"
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${SEVERITY_BADGE[flag.severity]}`}
        >
          {flag.severity}
        </span>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
          ✓ Verified
        </span>
        <span className="font-semibold">{flag.title}</span>
      </div>
      <p className="mb-2 text-sm text-slate-700">{flag.explanation}</p>
      <blockquote className="border-l-2 border-slate-300 pl-2 text-xs italic text-slate-500">
        “{flag.quote.length > 220 ? flag.quote.slice(0, 220) + "…" : flag.quote}”
      </blockquote>
      <p className="mt-1 text-xs text-slate-400">Tap to see this clause in the document ↓</p>
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
    <div className="space-y-5">
      {CATEGORIES.map((cat) => {
        const catFlags = analysis.flags
          .map((f, i) => ({ flag: f, index: i }))
          .filter(({ flag }) => flag.category === cat);
        return (
          <div key={cat}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABELS[cat]}
              {catFlags.length === 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium normal-case text-green-700">
                  clean
                </span>
              )}
            </h3>
            {catFlags.length > 0 && (
              <div className="space-y-3">
                {catFlags.map(({ flag, index }) => (
                  <FlagCard key={index} flag={flag} index={index} onSelect={onSelectFlag} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {analysis.unverified.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <button
            onClick={() => setShowUnverified((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-semibold text-slate-600"
          >
            <span>
              Needs human review ({analysis.unverified.length}) — couldn&apos;t verify the exact
              clause
            </span>
            <span>{showUnverified ? "▲" : "▼"}</span>
          </button>
          {showUnverified && (
            <ul className="mt-3 space-y-2">
              {analysis.unverified.map((f, i) => (
                <li key={i} className="text-sm text-slate-600">
                  <span
                    className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${SEVERITY_BADGE[f.severity]}`}
                  >
                    {f.severity}
                  </span>
                  <span className="font-medium">{f.title}</span> — {f.explanation}{" "}
                  <span className="text-xs text-slate-400">
                    (no verbatim quote found; treat with caution)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
