import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { unwrap, getLastFailure } from "@/lib/errors";
import { VERDICT_PRESENTATION } from "@/lib/verdict";
import type { Verdict } from "@/lib/types";
import { DecodeAction, RegisterEmpty } from "@/components/Register";

export const dynamic = "force-dynamic";

export default async function RegistryPage() {
  const db = supabase();
  let rows: { id: string; title: string; verdict: Verdict; created_at: string }[] = [];
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
        <RegisterEmpty
          state="unavailable"
          headline="The registry is unavailable"
          explain="Decoding still works. Results just won't be listed here until the registry is back."
          action={<DecodeAction />}
        />
      ) : rows.length === 0 ? (
        <RegisterEmpty
          state="empty"
          headline="Nothing on file yet"
          explain="Decode a document and it becomes the first entry in the registry."
          action={<DecodeAction>Decode the first one</DecodeAction>}
        />
      ) : (
        <ul className="divide-y divide-rule border-2 border-ink bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/results/${r.id}`}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-canary/12"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 ${VERDICT_PRESENTATION[r.verdict]?.dotClass ?? "bg-ink-faint"}`}
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
