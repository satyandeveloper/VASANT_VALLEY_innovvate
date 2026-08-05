"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Next 16 passes `retry` (re-fetches and
 * re-renders the segment); `reset` only clears state without re-fetching and
 * so can't recover a failed Server Component.
 *
 * Kept deliberately quiet. The verdict stamp already carries this product's
 * boldness and appears on three other screens; a fourth use would be
 * decoration. What is worth designing here is the reference code — when
 * something breaks it is the only handle anyone has, so it is set to be read
 * aloud, transcribed or copied rather than squinted at.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(JSON.stringify({ level: "error", scope: "render", digest: error.digest }));
  }, [error]);

  async function copyRef() {
    if (!error.digest) return;
    await navigator.clipboard.writeText(error.digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <p className="field-label mb-2 text-oxblood">Error</p>
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
        This page didn&apos;t load
      </h2>
      {/* Names whose fault it is, and answers the question actually being
          asked: is my document gone? */}
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        The fault is on our side, not with the document you sent. Nothing you decoded has been
        lost.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => retry()}
          className="btn"
        >
          Try again
        </button>
        <Link
          href="/"
          className="btn btn-quiet"
        >
          Decode a document
        </Link>
      </div>

      {error.digest && (
        <div className="mt-8 border border-rule bg-white">
          <p className="field-label border-b border-rule px-3 py-1.5">
            Quote this if you report it
          </p>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <code className="select-all font-type text-base tracking-wider text-ink">
              {error.digest}
            </code>
            <button
              onClick={copyRef}
              className="field-label shrink-0 border border-ink px-2.5 py-1 text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
