import Link from "next/link";

/**
 * A missing page, in the app's own vocabulary. Shared result links are the main
 * way people arrive here — an analysis that was never stored, or an id that no
 * longer resolves — so the copy names that case and offers the thing they were
 * probably after rather than a generic apology.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <div className="stamp mb-6 text-sm text-ink-faint">Not on file</div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
        There&apos;s nothing at this address
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        If you followed a link to a decoded document, it may never have been saved, or it may have
        been cleared since. Decoding it again takes about ten seconds.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="border-2 border-ink bg-ink px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-paper transition-colors hover:border-ditto hover:bg-ditto"
        >
          Decode a document
        </Link>
        <Link
          href="/registry"
          className="border-2 border-ink px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-ink transition-colors hover:bg-canary"
        >
          Browse the registry
        </Link>
      </div>
    </div>
  );
}
