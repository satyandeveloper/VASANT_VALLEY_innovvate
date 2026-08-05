"use client";

import { useEffect, useMemo, useRef } from "react";
import type { VerifiedFlag } from "@/lib/types";

interface Segment {
  text: string;
  flagIndex: number | null;
  severity?: VerifiedFlag["severity"];
}

/** Slice the original document into plain and highlighted segments. */
function buildSegments(docText: string, flags: VerifiedFlag[]): Segment[] {
  const indexed = flags
    .map((f, i) => ({ ...f, i }))
    .sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let pos = 0;
  for (const f of indexed) {
    if (f.start < pos) continue; // drop overlapping later range
    if (f.start > pos) segments.push({ text: docText.slice(pos, f.start), flagIndex: null });
    segments.push({
      text: docText.slice(f.start, f.end),
      flagIndex: f.i,
      severity: f.severity,
    });
    pos = f.end;
  }
  if (pos < docText.length) segments.push({ text: docText.slice(pos), flagIndex: null });
  return segments;
}

export function DocumentViewer({
  docText,
  flags,
  selectedFlag,
  onSelectFlag,
}: {
  docText: string;
  flags: VerifiedFlag[];
  selectedFlag: number | null;
  onSelectFlag: (index: number) => void;
}) {
  const segments = useMemo(() => buildSegments(docText, flags), [docText, flags]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedFlag === null) return;
    const el = containerRef.current?.querySelector<HTMLElement>(`#flag-${selectedFlag}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("pulsing");
    // restart the pulse animation
    void el.offsetWidth;
    el.classList.add("pulsing");
  }, [selectedFlag]);

  return (
    <div
      ref={containerRef}
      className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm"
    >
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        Original document — cited clauses highlighted
      </h3>
      <div className="whitespace-pre-wrap break-words">
        {segments.map((seg, i) =>
          seg.flagIndex === null ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <mark
              key={i}
              id={`flag-${seg.flagIndex}`}
              className={`flag-highlight severity-${seg.severity}`}
              onClick={() => onSelectFlag(seg.flagIndex!)}
              title="Cited clause — verified verbatim"
            >
              {seg.text}
            </mark>
          )
        )}
      </div>
    </div>
  );
}
