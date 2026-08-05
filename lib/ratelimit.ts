import { createHash } from "crypto";
import { supabase } from "./supabase";

const WINDOW_MINUTES = 10;
const MAX_LIVE_CALLS = 8;

/**
 * Light per-IP sliding window, backed by Supabase (no extra infra).
 * Only counts requests that would trigger a live AI call — cache hits are
 * free and unlimited, so demos never throttle.
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  const db = supabase();
  if (!db) return true; // no DB configured — don't block
  const ipHash = createHash("sha256").update(ip).digest("hex");
  try {
    await db.from("request_log").insert({ ip_hash: ipHash });
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await db
      .from("request_log")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    return (count ?? 0) <= MAX_LIVE_CALLS;
  } catch {
    return true; // rate limiter failure must never break analysis
  }
}
