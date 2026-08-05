"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Analysis } from "@/lib/types";
import { MAX_CHARS } from "@/lib/types";
import { ResultView } from "./ResultView";
import { ReadingWindow } from "./ReadingWindow";

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
  const [error, setError] = useState<{
    message: string;
    requestId?: string;
    retryable?: boolean;
  } | null>(null);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fallbackToPaste) setTab("paste");
        setError({
          message: data.error ?? "Something went wrong. Please retry.",
          requestId: data.requestId,
          retryable: data.retryable,
        });
        return;
      }
      setAnalysis(data.analysis);
    } catch (e) {
      // A timeout and a dropped connection need different advice: retrying a
      // 58s timeout with the same document will just time out again.
      const timedOut = e instanceof DOMException && e.name === "TimeoutError";
      setError({
        message: timedOut
          ? "That document took too long to analyse. Try a shorter section of it."
          : "The connection dropped before the analysis finished. Please retry.",
        retryable: !timedOut,
      });
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = tab === "paste" ? text.trim().length > 0 : url.trim().length > 0;

  return (
    <div className="space-y-6">
      <section className="border-2 border-ink bg-white">
        {/* Tabs as filing dividers rather than pills. */}
        <div className="flex border-b-2 border-ink">
          {(["paste", "url"] as const).map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`field-label px-4 py-2.5 transition-colors ${
                i === 0 ? "border-r-2 border-ink" : ""
              } ${tab === t ? "bg-ink text-paper" : "text-ink-soft hover:bg-canary/25"}`}
            >
              {t === "paste" ? "Paste text" : "From a link"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "paste" ? (
            <div>
              <label htmlFor="doc" className="field-label mb-2 block">
                The document
              </label>
              {/* While it runs, the box holding your document shows it being
                  read instead. Same content, same place — no jump, and nothing
                  important lands below the fold. */}
              {loading && text.trim() ? (
                <ReadingWindow
                  text={text}
                  phase={PROGRESS_STEPS[progressStep]}
                  step={progressStep + 1}
                  steps={PROGRESS_STEPS.length}
                />
              ) : (
                <>
                  <textarea
                    id="doc"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste a Terms of Service, privacy policy, rental agreement, or any consent text here…"
                    className="h-52 w-full resize-y border border-rule bg-paper/40 p-3 font-type text-[13px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-ditto focus:outline-none"
                  />
                  <p
                    className={`field-label mt-1.5 text-right ${
                      text.length > MAX_CHARS ? "text-oxblood" : ""
                    }`}
                  >
                    {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="url" className="field-label mb-2 block">
                Link to the document
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/terms"
                className="w-full border border-rule bg-paper/40 p-3 font-type text-[13px] text-ink placeholder:text-ink-faint focus:border-ditto focus:outline-none"
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={analyze}
              disabled={!canAnalyze || loading}
              // Disabled reads as an empty outline waiting to be filled, rather
              // than a washed-out solid that looks broken.
              className="font-display text-sm font-bold uppercase tracking-wider border-2 border-ink bg-ink px-7 py-3 text-paper transition-colors hover:bg-ditto hover:border-ditto disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink-faint disabled:border-rule disabled:hover:bg-transparent"
            >
              {loading ? "Decoding…" : "Decode it"}
            </button>
          </div>

          {/* Fetching a link has no document in hand yet, so there is nothing
              real to show being read; inventing one would be theatre. */}
          {loading && tab === "url" && (
            <p className="field-label mt-4 animate-pulse">{PROGRESS_STEPS[progressStep]}</p>
          )}

          {error && (
            <div className="mt-4 flex items-start justify-between gap-3 border-l-4 border-oxblood bg-oxblood/8 p-3.5">
              <div>
                <p className="text-sm leading-relaxed text-oxblood">{error.message}</p>
                {error.requestId && <p className="field-label mt-1.5">Ref {error.requestId}</p>}
              </div>
              {/* Offer retry only when retrying could plausibly work — a hidden
                  retry button beats one that reproduces the same failure. */}
              {error.retryable !== false && (
                <button
                  onClick={analyze}
                  className="field-label shrink-0 border border-oxblood px-3 py-1.5 text-oxblood transition-colors hover:bg-oxblood hover:text-white"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>

        {samples.length > 0 && (
          <div className="border-t-2 border-ink px-5 py-4">
            <p className="field-label mb-2.5">Already decoded — open one</p>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <Link
                  key={s.id}
                  href={`/results/${s.id}`}
                  className="border border-rule px-3 py-1.5 font-type text-xs text-ink transition-colors hover:border-ditto hover:bg-canary/25"
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
