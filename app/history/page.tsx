import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VERDICT_DOT: Record<string, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  not_legal: "bg-slate-400",
};

export default async function HistoryPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <p className="text-sm text-slate-500">Sign-in isn&apos;t configured on this deployment.</p>
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold">Your history</h1>
        <p className="text-sm text-slate-600">
          Sign in (top right) to keep a personal list of everything you&apos;ve decoded. The app
          works fully without an account — history is just a convenience.
        </p>
      </div>
    );
  }

  const db = supabase();
  let rows: {
    created_at: string;
    analyses: { id: string; title: string; verdict: string } | null;
  }[] = [];
  if (db) {
    const { data } = await db
      .from("user_history")
      .select("created_at, analyses ( id, title, verdict )")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    rows = (data ?? []) as unknown as typeof rows;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold">Your history</h1>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Nothing yet — analyse a document and it&apos;ll appear here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows
            .filter((r) => r.analyses)
            .map((r) => (
              <li key={r.analyses!.id}>
                <Link
                  href={`/results/${r.analyses!.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${
                      VERDICT_DOT[r.analyses!.verdict] ?? "bg-slate-400"
                    }`}
                  />
                  <span className="flex-1 truncate font-medium">{r.analyses!.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
