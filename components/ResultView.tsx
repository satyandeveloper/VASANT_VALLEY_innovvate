"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/types";
import { VerdictCard } from "./VerdictCard";
import { FlagList } from "./FlagList";
import { DocumentViewer } from "./DocumentViewer";

export function ResultView({ analysis }: { analysis: Analysis }) {
  const [selectedFlag, setSelectedFlag] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <VerdictCard analysis={analysis} />
      {analysis.verdict !== "not_legal" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <FlagList analysis={analysis} onSelectFlag={setSelectedFlag} />
          <div className="lg:sticky lg:top-20 lg:self-start">
            <DocumentViewer
              docText={analysis.docText}
              flags={analysis.flags}
              selectedFlag={selectedFlag}
              onSelectFlag={setSelectedFlag}
            />
          </div>
        </div>
      )}
    </div>
  );
}
