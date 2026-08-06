/**
 * Error classification decides three things at once: what the user is told,
 * what status the client sees, and whether a retry is worth offering. Getting
 * it wrong is not cosmetic — telling someone "please retry" when the API key
 * is invalid sends them into a loop that cannot succeed.
 *
 * The rule these tests protect is that classification reads the provider's
 * structured fields (code / type / status), never the prose of the message.
 * Providers reword messages without notice; an error whose classification
 * depends on wording silently reclassifies itself one day.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  classifyOpenAI,
  classifySupabase,
  unwrap,
  newRequestId,
  recordFailure,
  clearFailure,
  getLastFailure,
} from "../lib/platform/errors";

describe("classifyOpenAI", () => {
  test("out of credits is reported as the operator's problem, not the user's", () => {
    const app = classifyOpenAI({ code: "insufficient_quota", message: "you ran out" });
    assert.equal(app.code, "openai_no_credits");
    assert.equal(app.retryable, false, "retrying cannot add credits");
    assert.match(app.userMessage, /top up|credits/i);
  });

  test("recognises the credit-balance variant of the same condition", () => {
    assert.equal(classifyOpenAI({ code: "credit_balance_exhausted" }).code, "openai_no_credits");
  });

  test("a bad key is not offered as retryable", () => {
    const app = classifyOpenAI({ status: 401, code: "invalid_api_key" });
    assert.equal(app.code, "openai_bad_key");
    assert.equal(app.retryable, false);
  });

  test("rate limiting is retryable", () => {
    const app = classifyOpenAI({ status: 429, code: "rate_limit_exceeded" });
    assert.equal(app.code, "openai_rate_limited");
    assert.equal(app.retryable, true);
    assert.equal(app.status, 429);
  });

  test("a provider outage is retryable and reported as a gateway failure", () => {
    const app = classifyOpenAI({ status: 503 });
    assert.equal(app.code, "openai_unavailable");
    assert.equal(app.retryable, true);
    assert.equal(app.status, 502);
  });

  test("an unrecognised failure degrades to a safe retryable default", () => {
    const app = classifyOpenAI(new Error("something entirely new"));
    assert.equal(app.code, "openai_bad_response");
    assert.equal(app.retryable, true);
  });

  test("reads nested error objects as the SDK actually returns them", () => {
    const app = classifyOpenAI({ error: { code: "insufficient_quota", message: "nope" } });
    assert.equal(app.code, "openai_no_credits");
  });

  test("classifies on structured fields, not on message wording", () => {
    // Same words, no structured fields: must NOT be read as an out-of-credits.
    const byProse = classifyOpenAI({ message: "insufficient_quota credit balance exhausted" });
    assert.equal(byProse.code, "openai_bad_response");
  });

  test("never leaks provider detail into the user-facing message", () => {
    const app = classifyOpenAI({ status: 401, message: "sk-secret-key-abc123 rejected" });
    assert.doesNotMatch(app.userMessage, /sk-secret-key-abc123/);
  });

  test("always yields a usable status and message", () => {
    for (const err of [{}, null, undefined, "string error", new Error("x")]) {
      const app = classifyOpenAI(err);
      assert.ok(app.status >= 400 && app.status < 600, `bad status for ${JSON.stringify(err)}`);
      assert.ok(app.userMessage.length > 0);
    }
  });
});

describe("classifySupabase", () => {
  test("a missing table is called out as a deploy mistake, not a blip", () => {
    const app = classifySupabase({ code: "PGRST205", message: "relation does not exist" });
    assert.equal(app.code, "supabase_schema_missing");
    assert.equal(app.retryable, false, "retrying will not create the table");
    assert.match(app.message, /schema\.sql/, "operator detail should name the fix");
  });

  test("recognises the Postgres code for the same condition", () => {
    assert.equal(classifySupabase({ code: "42P01" }).code, "supabase_schema_missing");
  });

  test("a permission failure is distinguished from an outage", () => {
    assert.equal(classifySupabase({ code: "42501" }).code, "supabase_forbidden");
  });

  test("an unknown database error is treated as a transient outage", () => {
    const app = classifySupabase({ code: "08006", message: "connection reset" });
    assert.equal(app.code, "supabase_unavailable");
    assert.equal(app.retryable, true);
  });

  test("keeps the user message free of database internals", () => {
    const app = classifySupabase({ code: "42501", message: 'relation "user_history" denied' });
    assert.doesNotMatch(app.userMessage, /user_history|relation/);
  });
});

describe("unwrap", () => {
  test("returns data when the query succeeded", () => {
    assert.deepEqual(unwrap("test.ok", { data: [{ id: 1 }], error: null }), [{ id: 1 }]);
  });

  test("returns null rather than throwing, so read paths degrade gracefully", () => {
    assert.equal(unwrap("test.fail", { data: null, error: { code: "PGRST205" } }), null);
  });

  test("remembers the failure so /api/health can report what is broken", () => {
    clearFailure("supabase");
    unwrap("test.fail", { data: null, error: { code: "PGRST205", message: "gone" } });
    const last = getLastFailure("supabase");
    assert.ok(last, "failure should have been recorded");
    assert.equal(last.code, "supabase_schema_missing");
  });

  test("a later success clears the remembered failure", () => {
    unwrap("test.fail", { data: null, error: { code: "PGRST205" } });
    unwrap("test.ok", { data: [], error: null });
    assert.equal(getLastFailure("supabase"), null);
  });
});

describe("subsystem failure memory", () => {
  test("reports nothing for a subsystem that has not failed", () => {
    clearFailure("openai");
    assert.equal(getLastFailure("openai"), null);
  });

  test("records a timestamp alongside the code", () => {
    clearFailure("openai");
    recordFailure("openai", classifyOpenAI({ status: 401 }));
    const last = getLastFailure("openai");
    assert.ok(last);
    assert.equal(last.code, "openai_bad_key");
    assert.ok(!Number.isNaN(Date.parse(last.at)), "timestamp should be parseable");
    clearFailure("openai");
  });
});

describe("AppError", () => {
  test("separates the operator detail from what the user is shown", () => {
    const err = new AppError({
      code: "internal",
      status: 500,
      userMessage: "Something went wrong. Please retry.",
      detail: "connection string rejected by host db-prod-1",
    });
    assert.equal(err.message, "connection string rejected by host db-prod-1");
    assert.doesNotMatch(err.userMessage, /db-prod-1/);
  });

  test("falls back to the user message when no detail is given", () => {
    const err = new AppError({ code: "internal", status: 500, userMessage: "Oops" });
    assert.equal(err.message, "Oops");
  });

  test("is a real Error, so it survives instanceof and stack capture", () => {
    const err = new AppError({ code: "internal", status: 500, userMessage: "x" });
    assert.ok(err instanceof Error);
    assert.equal(err.name, "AppError");
    assert.ok(err.stack);
  });
});

describe("newRequestId", () => {
  test("is short enough for a user to read out over the phone", () => {
    const id = newRequestId();
    assert.ok(id.length >= 6 && id.length <= 10, `unexpected length: ${id}`);
    assert.match(id, /^[a-z0-9]+$/);
  });

  test("does not collide across a realistic burst of requests", () => {
    const ids = new Set(Array.from({ length: 5000 }, newRequestId));
    assert.ok(ids.size > 4990, `too many collisions: ${5000 - ids.size}`);
  });
});
