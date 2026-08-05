import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Server-only Supabase client. Prefers the secret (service-role) key when
 * available; falls back to the publishable key (RLS policies in
 * supabase/schema.sql grant the anon role the access the app needs).
 * Returns null when Supabase isn't configured — callers degrade gracefully.
 */
export function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  _client ??= createClient(url, key, { auth: { persistSession: false } });
  return _client;
}
