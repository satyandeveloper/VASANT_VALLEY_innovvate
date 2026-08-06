/**
 * Exercise the allowance rules against the real database.
 *
 *   npx tsx scripts/check-quota.ts
 *
 * There is no test runner in this project, and adding one to cover a single
 * module would be a larger change than the module itself. This is the next
 * best thing: it drives `checkAllowance` with throwaway subject ids, asserts
 * the behaviour that matters, and deletes its own rows afterwards.
 *
 * It talks to the configured Supabase project, so it also doubles as a check
 * that the `subject` column from supabase/schema.sql was actually applied —
 * without it, every assertion below fails.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "crypto";
import {
  checkAllowance,
  ANON_LIMIT,
  USER_LIMIT,
  type Subject,
} from "../lib/ratelimit";
import { supabase } from "../lib/supabase";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) {
    console.log(`    expected ${JSON.stringify(expected)}`);
    console.log(`    got      ${JSON.stringify(actual)}`);
  }
}

/** A fresh subject and a fresh IP per case, so cases cannot contaminate each other. */
function freshSubject(kind: Subject["kind"]): Subject {
  return { kind, id: randomUUID() };
}
const freshIp = () => `203.0.113.${Math.floor(Math.random() * 254) + 1}-${randomUUID()}`;

async function main() {
  const db = supabase();
  if (!db) {
    console.error("Supabase is not configured — set SUPABASE_URL and a key in .env.local.");
    process.exit(1);
  }

  const subjects: string[] = [];
  const track = (s: Subject) => {
    subjects.push(`${s.kind}:${s.id}`);
    return s;
  };

  // --- the anonymous allowance -------------------------------------------
  {
    const s = track(freshSubject("anon"));
    const ip = freshIp();
    const results = [];
    for (let i = 0; i < ANON_LIMIT + 1; i++) results.push(await checkAllowance(s, ip));

    check(
      `anonymous: first ${ANON_LIMIT} allowed`,
      results.slice(0, ANON_LIMIT).every((r) => r.ok),
      true
    );
    const refused = results[ANON_LIMIT];
    check(`anonymous: call ${ANON_LIMIT + 1} refused`, refused.ok, false);
    check(
      "anonymous: refused for quota, not burst",
      refused.ok === false ? refused.reason : null,
      "quota"
    );
    check(
      "anonymous: refusal carries a reset date",
      refused.ok === false && refused.reason === "quota" ? typeof refused.resetAt : null,
      "string"
    );
  }

  // --- a refusal must not consume a slot ----------------------------------
  // The whole point of counting before inserting: if refusals were recorded,
  // a client in a retry loop would push its own unblock time further out on
  // every attempt and could never recover.
  {
    const s = track(freshSubject("anon"));
    const ip = freshIp();
    for (let i = 0; i < ANON_LIMIT; i++) await checkAllowance(s, ip);
    for (let i = 0; i < 4; i++) await checkAllowance(s, ip); // refused attempts

    const { count } = await db
      .from("request_log")
      .select("*", { count: "exact", head: true })
      .eq("subject", `${s.kind}:${s.id}`);
    check("refusals are not recorded", count, ANON_LIMIT);
  }

  // --- signing in raises the ceiling --------------------------------------
  // Rows are written directly rather than by making 100 calls: this asserts
  // the boundary, and the loop above already covers the counting path.
  {
    const s = track(freshSubject("user"));
    const key = `${s.kind}:${s.id}`;
    const ip = freshIp();
    // ip_hash is deliberately the subject key rather than a real IP hash, so
    // these 99 rows cannot trip the burst window for the IP used below.
    const rows = Array.from({ length: USER_LIMIT - 1 }, () => ({ subject: key, ip_hash: key }));
    const { error } = await db.from("request_log").insert(rows);
    if (error) {
      console.error(`✗ could not seed ${USER_LIMIT - 1} rows: ${error.message}`);
      failures++;
    } else {
      check(`signed in: call ${USER_LIMIT} allowed`, (await checkAllowance(s, ip)).ok, true);
      const over = await checkAllowance(s, ip);
      check(`signed in: call ${USER_LIMIT + 1} refused`, over.ok, false);
      check(
        "signed in: refused for quota",
        over.ok === false ? over.reason : null,
        "quota"
      );
    }
  }

  // --- the burst floor, which is what a cookie-dropping script meets -------
  {
    const ip = freshIp();
    const results = [];
    for (let i = 0; i < 9; i++) {
      const s = track(freshSubject("anon")); // a new cookie every time
      results.push(await checkAllowance(s, ip));
    }
    const last = results[8];
    check("burst: a fresh cookie per call is still stopped by the IP", last.ok, false);
    check("burst: refused for burst, not quota", last.ok === false ? last.reason : null, "burst");
  }

  // --- clean up ------------------------------------------------------------
  // Verified rather than assumed. request_log grants select and insert but
  // deliberately no delete — a delete policy would let any visitor wipe their
  // own quota — so under the publishable key PostgREST filters this delete to
  // zero rows and reports success. Counting afterwards is the only way to know
  // whether anything actually went, and claiming a cleanup that did not happen
  // is worse than admitting one that could not.
  const { error: cleanup } = await db.from("request_log").delete().in("subject", subjects);
  const { count: left } = await db
    .from("request_log")
    .select("*", { count: "exact", head: true })
    .in("subject", subjects);

  if (cleanup) {
    console.warn(`\n! cleanup failed: ${cleanup.message}`);
  } else if (left) {
    console.warn(
      `\n! ${left} test row(s) remain — the delete was filtered by RLS.\n` +
        `  Remove them with:\n` +
        `  npx supabase db query --linked "delete from request_log where subject in (${subjects
          .map((s) => `'${s}'`)
          .join(", ")});"`
    );
  } else {
    console.log(`\ncleaned up ${subjects.length} test subjects`);
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
