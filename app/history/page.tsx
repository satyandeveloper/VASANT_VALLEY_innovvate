import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { unwrap, getLastFailure } from "@/lib/errors";

export const dynamic = "force-dynamic";

const VERDICT_DOT: Record<string, string> = {
  green: "bg-sage",
  amber: "bg-canary-deep",
  red: "bg-oxblood",
  not_legal: "bg-ink-faint",
};

export default async function HistoryPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <p className="field-label">Sign-in isn&apos;t configured on this deployment.</p>;
  }

  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="mx-auto max-w-md border-2 border-ink bg-white p-6 text-center">
        <p className="field-label mb-2">Your history</p>
        <h1 className="font-display text-xl font-extrabold text-ink">Keep your own copy</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Sign in to keep a list of everything you&apos;ve decoded. Everything works without an
          account — this is only a convenience.
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
    const data = unwrap(
      "history.list",
      await db
        .from("user_history")
        .select("created_at, analyses ( id, title, verdict )")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
    );
    rows = (data ?? []) as unknown as typeof rows;
  }

  // Don't tell a returning user they have no history when the lookup failed.
  const degraded = rows.length === 0 && (!db || getLastFailure("supabase") !== null);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="field-label mb-2">Your file</p>
      <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight text-ink">
        Everything you&apos;ve decoded
      </h1>
      {degraded ? (
        <p className="border-l-4 border-canary-deep bg-canary/12 p-5 text-sm leading-relaxed text-ink">
          Your history can&apos;t be loaded right now. This is a problem on our side — nothing
          you saved has been lost. Try again shortly.
        </p>
      ) : rows.length === 0 ? (
        <p className="border border-dashed border-rule p-5 text-sm text-ink-soft">
          Nothing yet. Decode a document and it&apos;ll appear here.
        </p>
      ) : (
        <ul className="divide-y divide-rule border-2 border-ink bg-white">
          {rows
            .filter((r) => r.analyses)
            .map((r) => (
              <li key={r.analyses!.id}>
                <Link
                  href={`/results/${r.analyses!.id}`}
                  className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-canary/12"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 ${
                      VERDICT_DOT[r.analyses!.verdict] ?? "bg-ink-faint"
                    }`}
                  />
                  <span className="flex-1 truncate text-[15px] text-ink">
                    {r.analyses!.title}
                  </span>
                  <span className="field-label shrink-0">
                    {new Date(r.created_at).toLocaleDateString(undefined, {
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
