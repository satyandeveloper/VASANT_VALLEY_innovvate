import { NextResponse } from "next/server";
import { supabase, supabaseConfig } from "@/lib/platform/supabase";
import { classifySupabase, getLastFailure, type PostgrestErrorLike } from "@/lib/platform/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational diagnostics: what is configured, what is actually reachable, and
 * what failed most recently. Reports booleans and error codes only — never key
 * material — so it is safe to leave reachable.
 *
 * Returns 200 when everything needed to serve a full analysis is working, and
 * 503 when something is broken, so it can back a uptime check directly.
 */

type Check = {
  status: "ok" | "degraded" | "down";
  detail: string;
  lastFailure?: { code: string; detail: string; at: string } | null;
};

function openaiCheck(): Check {
  const key = process.env.OPENAI_API_KEY?.trim();
  const failure = getLastFailure("openai");

  if (!key) {
    return { status: "down", detail: "OPENAI_API_KEY is not set — analysis will fail" };
  }
  // Deliberately no live probe: listing models succeeds even on a zero-credit
  // account, so it would report healthy in exactly the case that matters. The
  // only honest signal is what real analyses have been doing.
  if (failure) {
    const down = failure.code === "openai_no_credits" || failure.code === "openai_bad_key";
    return {
      status: down ? "down" : "degraded",
      detail:
        failure.code === "openai_no_credits"
          ? "the OpenAI account is out of credits — top it up to restore analysis"
          : failure.code === "openai_bad_key"
            ? "the OpenAI API key was rejected — check OPENAI_API_KEY"
            : "recent analyses have been failing",
      lastFailure: failure,
    };
  }
  return { status: "ok", detail: "key configured; no recent failures" };
}

async function supabaseCheck(): Promise<Check> {
  const cfg = supabaseConfig();
  if (!cfg.ok) {
    return { status: "down", detail: `${cfg.reason} — registry, history and sharing disabled` };
  }

  const db = supabase();
  if (!db) return { status: "down", detail: "client could not be created" };

  // Cheapest possible probe that still proves the schema exists.
  const { error } = await db.from("analyses").select("id").limit(1);
  if (error) {
    const app = classifySupabase(error as PostgrestErrorLike);
    return {
      status: "down",
      detail:
        app.code === "supabase_schema_missing"
          ? "schema not applied — run supabase/schema.sql against this project"
          : app.message,
      lastFailure: { code: app.code, detail: app.message, at: new Date().toISOString() },
    };
  }

  return {
    status: "ok",
    detail: `reachable; schema present (using ${cfg.usingSecretKey ? "secret" : "publishable"} key)`,
  };
}

function clerkCheck(): Check {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const sk = process.env.CLERK_SECRET_KEY?.trim();
  if (!pk || !sk) {
    // Auth is optional: analysis works signed-out, only history needs it.
    return { status: "degraded", detail: "not configured — sign-in and history are disabled" };
  }
  return {
    status: "ok",
    detail: pk.startsWith("pk_test") ? "configured (test keys)" : "configured (live keys)",
  };
}

export async function GET() {
  const checks = {
    openai: openaiCheck(),
    supabase: await supabaseCheck(),
    clerk: clerkCheck(),
  };

  // Clerk being absent degrades the app but doesn't stop it serving analyses.
  const down = checks.openai.status === "down" || checks.supabase.status === "down";
  const degraded = Object.values(checks).some((c) => c.status !== "ok");

  return NextResponse.json(
    {
      status: down ? "down" : degraded ? "degraded" : "ok",
      checks,
      time: new Date().toISOString(),
    },
    { status: down ? 503 : 200 }
  );
}
