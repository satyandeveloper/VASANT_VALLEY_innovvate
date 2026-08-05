"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/types";
import { severityCounts } from "@/lib/verdict";
import { copyText } from "@/lib/summary";

const VERDICT_STYLES: Record<
  Analysis["verdict"],
  { bg: string; text: string; label: string }
> = {
  green: { bg: "bg-green-600", text: "text-green-700", label: "GREEN — looks fair" },
  amber: { bg: "bg-amber-500", text: "text-amber-700", label: "AMBER — read carefully" },
  red: { bg: "bg-red-600", text: "text-red-700", label: "RED — serious flags" },
  not_legal: {
    bg: "bg-slate-500",
    text: "text-slate-600",
    label: "Not a terms document",
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`${style.bg} flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-white`}>
        <span className="text-lg font-bold">{style.label}</span>
        {analysis.verdict !== "not_legal" && (
          <span className="text-sm font-medium opacity-90">
            {counts.high} high · {counts.medium} medium · {counts.low} low
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm text-slate-500">{analysis.title}</p>
          <h2 className="text-xl font-bold leading-snug">{analysis.headline}</h2>
        </div>
        <ul className="space-y-2">
          {analysis.summaryBullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className={`mt-0.5 ${style.text}`}>●</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={onCopy}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            {copied ? "Copied ✓" : "Copy summary"}
          </button>
          {analysis.id && (
            <a
              href={`/api/og?id=${analysis.id}`}
              download="i-agree-verdict.png"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Share as image
            </a>
          )}
          {analysis.cached && (
            <span className="ml-auto self-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
              ⚡ recognised — served instantly from the registry
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
