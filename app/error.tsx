"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Next 16 passes `retry` (re-fetches and
 * re-renders the segment); `reset` only clears state without re-fetching and
 * so can't recover a failed Server Component.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", scope: "render", digest: error.digest }));
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <h2 className="text-xl font-bold">This page didn&apos;t load</h2>
      <p className="mt-2 text-sm text-slate-600">
        Something went wrong on our side. Your documents are safe — nothing was lost.
      </p>
      <button
        onClick={() => retry()}
        className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
      {error.digest && (
        <p className="mt-4 text-xs text-slate-400">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
