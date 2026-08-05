import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { unwrap, getLastFailure } from "@/lib/errors";

export const dynamic = "force-dynamic";

const VERDICT_DOT: Record<string, string> = {
  green: "bg-sage",
  amber: "bg-canary-deep",
  red: "bg-oxblood",
  not_legal: "bg-ink-faint",
};

export default async function RegistryPage() {
  const db = supabase();
  let rows: { id: string; title: string; verdict: string; created_at: string }[] = [];
  if (db) {
    rows =
      unwrap(
        "registry.list",
        await db
          .from("analyses")
          .select("id, title, verdict, created_at")
          .order("created_at", { ascending: false })
          .limit(50)
      ) ?? [];
  }

  // Distinguish "nothing analysed yet" from "the database is unreachable" —
  // rendering the cheerful empty state for both hides real outages.
  const failure = db ? getLastFailure("supabase") : null;
  const degraded = rows.length === 0 && (!db || failure !== null);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="field-label mb-2">Public registry</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
        Everything decoded so far
      </h1>
      <p className="mt-2 mb-6 max-w-xl leading-relaxed text-ink-soft">
        Documents are recognised by fingerprint. If someone has already decoded the one you
        paste, you get their answer instantly.
      </p>
      {degraded ? (
        <p className="border-l-4 border-canary-deep bg-canary/12 p-5 text-sm leading-relaxed text-ink">
          The registry can&apos;t be loaded right now. Decoding still works — results just
          won&apos;t be listed here until it&apos;s back.
        </p>
      ) : rows.length === 0 ? (
        <p className="border border-dashed border-rule p-5 text-sm text-ink-soft">
          Nothing decoded yet. Yours would be the first.
        </p>
      ) : (
        <ul className="divide-y divide-rule border-2 border-ink bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/results/${r.id}`}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-canary/12"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 ${VERDICT_DOT[r.verdict] ?? "bg-ink-faint"}`}
                />
                <span className="flex-1 truncate text-[15px] text-ink">{r.title}</span>
                <span className="field-label shrink-0">{r.verdict.replace("_", " ")}</span>
                <span className="field-label hidden shrink-0 sm:inline">
                  {new Date(r.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
