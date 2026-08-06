import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { supabase } from "@/lib/platform/supabase";
import { unwrap, getLastFailure } from "@/lib/platform/errors";
import { VERDICT_PRESENTATION } from "@/lib/analysis/verdict";
import type { Verdict } from "@/lib/types";
import { DecodeAction, RegisterEmpty } from "@/components/Register";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <p className="field-label">Sign-in isn&apos;t configured on this deployment.</p>;
  }

  const { userId } = await auth();
  // Signed out is a state of this page, not a different page. Keeping the same
  // heading and the same register means the shape of what you would get is
  // visible before you sign in.
  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="field-label mb-2">Your file</p>
        <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight text-ink">
          Everything you&apos;ve decoded
        </h1>
        <RegisterEmpty
          state="signed-out"
          headline="Sign in to keep your own file"
          explain="Decoding works without an account. Signing in only keeps a list of what you've already run."
          action={
            <SignInButton mode="modal">
              <button className="btn">
                Sign in
              </button>
            </SignInButton>
          }
        />
      </div>
    );
  }

  const db = supabase();
  let rows: {
    created_at: string;
    analyses: { id: string; title: string; verdict: Verdict } | null;
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
        <RegisterEmpty
          state="unavailable"
          headline="Your file can't be loaded"
          explain="This is a fault on our side, and nothing you saved has been lost. Try again shortly."
          action={<DecodeAction />}
        />
      ) : rows.length === 0 ? (
        <RegisterEmpty
          state="empty"
          headline="Nothing in your file yet"
          explain="Decode a document while signed in and it will be listed here."
          action={<DecodeAction />}
        />
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
                      VERDICT_PRESENTATION[r.analyses!.verdict]?.dotClass ?? "bg-ink-faint"
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
