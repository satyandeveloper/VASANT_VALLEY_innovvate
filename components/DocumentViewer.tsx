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
      className="max-h-[70vh] overflow-y-auto border-2 border-ink bg-white p-5 font-type text-[12px] leading-[1.7] text-ink"
    >
      <h3 className="field-label mb-3 border-b border-rule pb-2">
        The document itself — cited clauses marked
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
