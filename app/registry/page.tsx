import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VERDICT_DOT: Record<string, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  not_legal: "bg-slate-400",
};

export default async function RegistryPage() {
  const db = supabase();
  let rows: { id: string; title: string; verdict: string; created_at: string }[] = [];
  if (db) {
    const { data } = await db
      .from("analyses")
      .select("id, title, verdict, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    rows = data ?? [];
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Public registry</h1>
      <p className="mb-5 text-sm text-slate-600">
        Recently decoded documents. Identical documents are recognised by fingerprint and served
        instantly from here — no re-analysis needed.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Nothing decoded yet — be the first to analyse a document.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/results/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${VERDICT_DOT[r.verdict] ?? "bg-slate-400"}`}
                />
                <span className="flex-1 truncate font-medium">{r.title}</span>
                <span className="shrink-0 text-xs uppercase text-slate-400">
                  {r.verdict.replace("_", " ")}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
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
