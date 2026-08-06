import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { logWarn, type PostgrestErrorLike } from "./errors";

/**
 * How many live AI calls a subject may make, and how fast.
 *
 * Two limits, doing two different jobs:
 *
 *   The quota is the allowance. It is what a person experiences — five
 *   analyses a month, or a hundred once they sign in — and it is counted per
 *   subject, so signing in carries it across devices.
 *
 *   The burst window is the abuse floor. The anonymous subject is a cookie,
 *   and a cookie can be dropped on every request, so the quota alone caps
 *   nothing against a script. The IP window does, and it sits underneath both
 *   tiers because a stolen session can be hammered just as easily as an
 *   anonymous one.
 *
 * Only calls that reach the model are counted at all. Cache hits and the
 * sample documents are free and unmetered — a demo must never throttle.
 */
export const ANON_LIMIT = 5;
export const USER_LIMIT = 100;
export const QUOTA_WINDOW_DAYS = 30;

const BURST_LIMIT = 8;
const BURST_WINDOW_MINUTES = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Subject = { kind: "anon" | "user"; id: string };

export type Refusal =
  | {
      ok: false;
      reason: "quota";
      kind: Subject["kind"];
      limit: number;
      /** When the oldest counted call ages out, freeing one slot. */
      resetAt: string | null;
    }
  | { ok: false; reason: "burst" };

export type Allowance = { ok: true } | Refusal;

export function limitFor(kind: Subject["kind"]): number {
  return kind === "user" ? USER_LIMIT : ANON_LIMIT;
}

/**
 * supabase-js *returns* its errors instead of throwing them, so a try/catch
 * around a query never fires and every failure reads as a count of zero —
 * which fails open silently and invisibly. Every count here goes through this
 * so a broken limiter is at least loud in the logs.
 */
function countOf(
  scope: string,
  result: { count: number | null; error: PostgrestErrorLike | null }
): number | null {
  if (result.error) {
    logWarn(scope, { detail: result.error.message, impact: "request allowed unmetered" });
    return null;
  }
  return result.count ?? 0;
}

/** When one slot frees up: the oldest call still inside the window, plus the window. */
async function nextFreeSlot(
  db: SupabaseClient,
  subject: string,
  windowStart: string
): Promise<string | null> {
  const { data, error } = await db
    .from("request_log")
    .select("created_at")
    .eq("subject", subject)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !data?.length) return null;
  return new Date(new Date(data[0].created_at).getTime() + QUOTA_WINDOW_DAYS * DAY_MS).toISOString();
}

/**
 * Decide whether this request may make a live AI call, and record it if so.
 *
 * Counts before it inserts. The previous version inserted first and then
 * counted, which meant a refused request still consumed a slot: hammering the
 * endpoint after being blocked pushed your own unblock time further out, and a
 * bot in a retry loop could keep a real user locked out indefinitely.
 *
 * Fails open at every step. A rate limiter that breaks analysis when the
 * database hiccups has done more damage than the abuse it prevents.
 */
export async function checkAllowance(subject: Subject, ip: string): Promise<Allowance> {
  const db = supabase();
  if (!db) return { ok: true }; // no database configured — nothing to count with

  const key = `${subject.kind}:${subject.id}`;
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const limit = limitFor(subject.kind);
  const now = Date.now();

  try {
    const quotaStart = new Date(now - QUOTA_WINDOW_DAYS * DAY_MS).toISOString();
    const used = countOf(
      "ratelimit.quota_count_failed",
      await db
        .from("request_log")
        .select("*", { count: "exact", head: true })
        .eq("subject", key)
        .gte("created_at", quotaStart)
    );
    if (used !== null && used >= limit) {
      return {
        ok: false,
        reason: "quota",
        kind: subject.kind,
        limit,
        resetAt: await nextFreeSlot(db, key, quotaStart),
      };
    }

    const burstStart = new Date(now - BURST_WINDOW_MINUTES * 60_000).toISOString();
    const recent = countOf(
      "ratelimit.burst_count_failed",
      await db
        .from("request_log")
        .select("*", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", burstStart)
    );
    if (recent !== null && recent >= BURST_LIMIT) return { ok: false, reason: "burst" };

    const { error } = await db.from("request_log").insert({ subject: key, ip_hash: ipHash });
    if (error) {
      // The call is allowed but uncounted. Worth a line: if the `subject`
      // column was never added, every request lands here and the quota is
      // quietly doing nothing at all.
      logWarn("ratelimit.record_failed", {
        detail: error.message,
        impact: "call allowed but not counted against the quota",
      });
    }
    return { ok: true };
  } catch (e) {
    logWarn("ratelimit.failed", {
      detail: e instanceof Error ? e.message : String(e),
      impact: "request allowed unmetered",
    });
    return { ok: true };
  }
}
