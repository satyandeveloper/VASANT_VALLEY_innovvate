"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Analysis } from "@/lib/types";
import { MAX_CHARS } from "@/lib/types";
import { ResultView } from "./ResultView";

const PROGRESS_STEPS = [
  "Reading document…",
  "Scanning for risks…",
  "Verifying every quote against the source…",
];

export interface SampleChip {
  id: string;
  title: string;
  verdict: string;
}

export function AnalyzeForm({ samples }: { samples: SampleChip[] }) {
  const [tab, setTab] = useState<"paste" | "url">("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;
    setProgressStep(0);
    const t = setInterval(
      () => setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)),
      3000
    );
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    if (analysis) resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [analysis]);

  async function analyze() {
    setError(null);
    setAnalysis(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "paste" ? { text } : { url }),
        signal: AbortSignal.timeout(58_000),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fallbackToPaste) setTab("paste");
        setError(data.error ?? "Something went wrong. Please retry.");
        return;
      }
      setAnalysis(data.analysis);
    } catch {
      setError("Analysis took too long or the connection dropped. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = tab === "paste" ? text.trim().length > 0 : url.trim().length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setTab("paste")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "paste" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Paste text
          </button>
          <button
            onClick={() => setTab("url")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "url" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            From a link
          </button>
        </div>

        {tab === "paste" ? (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a Terms of Service, privacy policy, rental agreement, or any consent text here…"
              className="h-52 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm focus:border-slate-500 focus:outline-none"
            />
            <p
              className={`mt-1 text-right text-xs ${
                text.length > MAX_CHARS ? "text-red-600" : "text-slate-400"
              }`}
            >
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
            </p>
          </div>
        ) : (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/terms"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-slate-500 focus:outline-none"
          />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={analyze}
            disabled={!canAnalyze || loading}
            className="rounded-xl bg-slate-900 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
          >
            {loading ? "Analysing…" : "Analyse"}
          </button>
          {loading && (
            <span className="animate-pulse text-sm text-slate-500">
              {PROGRESS_STEPS[progressStep]}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={analyze}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1 font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {samples.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Or try a pre-analysed real document
            </p>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <Link
                  key={s.id}
                  href={`/results/${s.id}`}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm hover:border-slate-500"
                >
                  {s.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {analysis && (
        <div ref={resultsRef}>
          <ResultView analysis={analysis} />
        </div>
      )}
    </div>
  );
}
