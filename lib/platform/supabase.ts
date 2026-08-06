import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logWarn } from "./errors";

let _client: SupabaseClient | null = null;
let _warned = false;

/** Treat blank/whitespace-only env vars as absent. */
function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export type SupabaseConfig =
  | { ok: true; url: string; key: string; usingSecretKey: boolean }
  | { ok: false; reason: string };

/**
 * Resolve Supabase configuration, explaining itself when incomplete.
 *
 * Note the `env()` helper rather than `??` chaining: a declared-but-empty
 * `SUPABASE_SECRET_KEY=` in .env.local is the empty string, which is not
 * nullish, so `??` would stop there and never reach the publishable-key
 * fallback — silently disabling the database in local dev only.
 */
export function supabaseConfig(): SupabaseConfig {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const secret = env("SUPABASE_SECRET_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY");
  const key = secret ?? env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!url && !key) return { ok: false, reason: "no Supabase URL or key configured" };
  if (!url) return { ok: false, reason: "NEXT_PUBLIC_SUPABASE_URL is not set" };
  if (!key) {
    return {
      ok: false,
      reason:
        "no Supabase key set (SUPABASE_SECRET_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    };
  }
  return { ok: true, url, key, usingSecretKey: Boolean(secret) };
}

/**
 * Server-only Supabase client. Prefers the secret (service-role) key when
 * available; falls back to the publishable key (RLS policies in
 * supabase/schema.sql grant the anon role the access the app needs).
 * Returns null when Supabase isn't configured — callers degrade gracefully,
 * but the reason is logged once so the degradation isn't silent.
 */
export function supabase(): SupabaseClient | null {
  const cfg = supabaseConfig();
  if (!cfg.ok) {
    if (!_warned) {
      _warned = true;
      logWarn("supabase.unconfigured", {
        reason: cfg.reason,
        impact: "registry, history, sharing and the analysis cache are disabled",
      });
    }
    return null;
  }
  _client ??= createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
  return _client;
}
