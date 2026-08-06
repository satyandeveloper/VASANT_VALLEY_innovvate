/**
 * Central error classification, structured logging, and subsystem health.
 *
 * Three jobs:
 *  1. Turn provider-specific failures (OpenAI, Supabase) into a stable
 *     `AppError` with a code, an HTTP status, and a message safe to show a user.
 *  2. Emit one-line JSON logs so Vercel's log drain can be filtered by
 *     `code` / `scope` / `requestId` instead of grepped by eye.
 *  3. Remember the last failure per subsystem so /api/health can report what
 *     is actually broken right now, rather than only what is unconfigured.
 */

export type Subsystem = "openai" | "supabase" | "clerk" | "extract";

export type ErrorCode =
  // OpenAI
  | "openai_no_credits"
  | "openai_bad_key"
  | "openai_rate_limited"
  | "openai_unavailable"
  | "openai_bad_response"
  // Supabase
  | "supabase_unconfigured"
  | "supabase_schema_missing"
  | "supabase_forbidden"
  | "supabase_unavailable"
  // allowance — see lib/ratelimit.ts. Distinct codes because the client acts
  // on them differently: only `quota_anon` has a way out worth offering.
  | "quota_anon"
  | "quota_user"
  | "rate_limited"
  // generic
  | "bad_request"
  | "internal";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Safe to render to an end user — never contains provider internals. */
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(opts: {
    code: ErrorCode;
    status: number;
    userMessage: string;
    retryable?: boolean;
    /** Operator-facing detail; logged, never returned to the client. */
    detail?: string;
    cause?: unknown;
  }) {
    super(opts.detail ?? opts.userMessage, { cause: opts.cause });
    this.name = "AppError";
    this.code = opts.code;
    this.status = opts.status;
    this.userMessage = opts.userMessage;
    this.retryable = opts.retryable ?? false;
  }
}

/** Short correlation id echoed to the client so a user can quote it in a report. */
export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type LogFields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", scope: string, fields: LogFields) {
  const line = JSON.stringify({ level, scope, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logInfo(scope: string, fields: LogFields = {}) {
  emit("info", scope, fields);
}

export function logWarn(scope: string, fields: LogFields = {}) {
  emit("warn", scope, fields);
}

/** Log an error with its classification. Returns the AppError for rethrow/return. */
export function logError(scope: string, err: unknown, fields: LogFields = {}): AppError {
  const app = err instanceof AppError ? err : classifyUnknown(err);
  emit("error", scope, {
    ...fields,
    code: app.code,
    status: app.status,
    detail: app.message,
    cause: app.cause instanceof Error ? app.cause.message : undefined,
  });
  return app;
}

// ---------------------------------------------------------------------------
// Subsystem failure memory (process-local, best-effort — resets on cold start)
// ---------------------------------------------------------------------------

type Failure = { code: ErrorCode; detail: string; at: string };
const lastFailure = new Map<Subsystem, Failure>();

export function recordFailure(subsystem: Subsystem, err: AppError) {
  lastFailure.set(subsystem, {
    code: err.code,
    detail: err.message,
    at: new Date().toISOString(),
  });
}

export function clearFailure(subsystem: Subsystem) {
  lastFailure.delete(subsystem);
}

export function getLastFailure(subsystem: Subsystem): Failure | null {
  return lastFailure.get(subsystem) ?? null;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classifyUnknown(err: unknown): AppError {
  return new AppError({
    code: "internal",
    status: 500,
    userMessage: "Something went wrong. Please retry.",
    retryable: true,
    detail: err instanceof Error ? err.message : String(err),
    cause: err,
  });
}

/** Shape we read off an OpenAI SDK error without importing its types. */
type OpenAILike = {
  status?: number;
  code?: string;
  type?: string;
  error?: { code?: string; type?: string; message?: string };
  message?: string;
};

/**
 * Classify an OpenAI failure from the SDK's structured fields.
 *
 * Previously this was a regex over the message text, which silently
 * reclassifies whenever OpenAI rewords an error. `code`/`type`/`status` are
 * part of the API contract; the message is not.
 */
export function classifyOpenAI(err: unknown): AppError {
  const e = (err ?? {}) as OpenAILike;
  const code = e.code ?? e.error?.code ?? "";
  const type = e.type ?? e.error?.type ?? "";
  const status = e.status ?? 0;
  const detail = e.error?.message ?? e.message ?? String(err);

  if (
    code === "credit_balance_exhausted" ||
    code === "insufficient_quota" ||
    type === "insufficient_quota"
  ) {
    const app = new AppError({
      code: "openai_no_credits",
      status: 503,
      userMessage:
        "The AI account has run out of credits — the site owner needs to top up the OpenAI account. Cached and sample documents still work.",
      detail,
      cause: err,
    });
    recordFailure("openai", app);
    return app;
  }

  if (status === 401 || code === "invalid_api_key" || code === "missing_api_key") {
    const app = new AppError({
      code: "openai_bad_key",
      status: 503,
      userMessage:
        "The analysis engine is misconfigured — the site owner needs to check the OpenAI API key. Cached and sample documents still work.",
      detail,
      cause: err,
    });
    recordFailure("openai", app);
    return app;
  }

  if (status === 429 || code === "rate_limit_exceeded") {
    const app = new AppError({
      code: "openai_rate_limited",
      status: 429,
      userMessage: "The analysis engine is busy right now. Please retry in a moment.",
      retryable: true,
      detail,
      cause: err,
    });
    recordFailure("openai", app);
    return app;
  }

  if (status >= 500 || code === "server_error") {
    const app = new AppError({
      code: "openai_unavailable",
      status: 502,
      userMessage: "The analysis engine is temporarily unavailable. Please retry.",
      retryable: true,
      detail,
      cause: err,
    });
    recordFailure("openai", app);
    return app;
  }

  const app = new AppError({
    code: "openai_bad_response",
    status: 502,
    userMessage: "Something went wrong during analysis. Please retry.",
    retryable: true,
    detail,
    cause: err,
  });
  recordFailure("openai", app);
  return app;
}

/** Shape of a PostgREST error returned (not thrown) by supabase-js. */
export type PostgrestErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

/**
 * Classify a PostgREST error object.
 *
 * `PGRST205` / `42P01` mean the table is absent — i.e. supabase/schema.sql was
 * never applied. That is a deploy-time mistake, not a runtime blip, so it is
 * worth surfacing loudly instead of rendering an empty list.
 */
export function classifySupabase(err: PostgrestErrorLike): AppError {
  const code = err.code ?? "";
  const detail = [err.message, err.details, err.hint].filter(Boolean).join(" | ");

  if (code === "PGRST205" || code === "42P01") {
    return new AppError({
      code: "supabase_schema_missing",
      status: 503,
      userMessage: "The database isn't set up yet. Saved results are unavailable.",
      detail: `schema not applied — run supabase/schema.sql (${detail})`,
      cause: err,
    });
  }

  if (code === "42501" || code === "PGRST301" || code === "PGRST302") {
    return new AppError({
      code: "supabase_forbidden",
      status: 503,
      userMessage: "The database rejected this request. Saved results are unavailable.",
      detail: `permission/RLS failure (${detail})`,
      cause: err,
    });
  }

  return new AppError({
    code: "supabase_unavailable",
    status: 503,
    userMessage: "The database is temporarily unavailable. Saved results may be missing.",
    retryable: true,
    detail,
    cause: err,
  });
}

/**
 * Inspect a supabase-js `{ data, error }` result, logging and remembering any
 * error. Returns `data` (or null) so read paths keep degrading gracefully.
 *
 * supabase-js *returns* errors rather than throwing them, so the `try/catch`
 * blocks these call sites used to rely on never fired — every failure was
 * discarded silently. Route every query result through here instead.
 */
export function unwrap<T>(
  scope: string,
  result: { data: T | null; error: PostgrestErrorLike | null },
  fields: LogFields = {}
): T | null {
  if (result.error) {
    const app = classifySupabase(result.error);
    recordFailure("supabase", app);
    logError(scope, app, fields);
    return null;
  }
  clearFailure("supabase");
  return result.data;
}
