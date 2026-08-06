import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, recordHistory, runAnalysis } from "@/lib/pipeline";
import { checkAllowance, USER_LIMIT, type Refusal } from "@/lib/ratelimit";
import { visitorId } from "@/lib/visitor";
import { MAX_CHARS, MIN_CHARS } from "@/lib/types";
import { extractFromUrl, ExtractError } from "@/lib/extract";
import {
  AppError,
  classifyOpenAI,
  clearFailure,
  logError,
  logInfo,
  newRequestId,
} from "@/lib/errors";

export const maxDuration = 60;
export const runtime = "nodejs";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/** "4 September" — a date a person can act on, not an ISO timestamp. */
function formatReset(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(iso));
}

/**
 * Turn a refusal into something the reader can do something about.
 *
 * The anonymous message only advertises signing in when there is actually a
 * sign-in to offer — Clerk is optional in this app, and promising an account
 * that doesn't exist is worse than saying nothing. Without it, the reader gets
 * the reset date instead, which is the only true thing left to tell them.
 */
function refusal(limit: Refusal, requestId: string) {
  if (limit.reason === "burst") {
    return NextResponse.json(
      {
        error: "You're going fast — try again in a few minutes.",
        code: "rate_limited",
        retryable: true,
        requestId,
      },
      { status: 429 }
    );
  }

  const resets = limit.resetAt ? ` Your next one unlocks on ${formatReset(limit.resetAt)}.` : "";
  const anon = limit.kind === "anon";
  const error =
    anon && clerkConfigured()
      ? `That's all ${limit.limit} free analyses for this month. Sign in and you get ${USER_LIMIT}.`
      : `You've used all ${limit.limit} analyses for this month.${resets}`;

  return NextResponse.json(
    { error, code: anon ? "quota_anon" : "quota_user", retryable: false, requestId },
    { status: 429 }
  );
}

export async function POST(req: NextRequest) {
  // Correlates the client-visible error, the server log line, and any report
  // a user files about a failed analysis.
  const requestId = newRequestId();

  let body: { text?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request.", requestId }, { status: 400 });
  }

  let text = (body.text ?? "").trim();
  let sourceType: "paste" | "url" = "paste";
  let sourceUrl: string | null = null;
  let titleHint: string | null = null;

  if (!text && body.url) {
    try {
      const extracted = await extractFromUrl(body.url);
      text = extracted.text;
      titleHint = extracted.title;
      sourceType = "url";
      sourceUrl = body.url;
    } catch (e) {
      const expected = e instanceof ExtractError;
      const message = expected
        ? e.message
        : "That site wouldn't let us read the page — paste the text instead.";
      // An ExtractError is a normal outcome for a hostile page; anything else
      // is a bug in the extractor and deserves a full log line.
      if (expected) logInfo("extract.rejected", { requestId, reason: e.message });
      else logError("extract.failed", e, { requestId });
      return NextResponse.json(
        { error: message, fallbackToPaste: true, requestId },
        { status: 422 }
      );
    }
  }

  if (text.length < MIN_CHARS) {
    return NextResponse.json(
      {
        error:
          "That looks too short to be a full document. Please paste the whole thing — terms pages are usually much longer.",
      },
      { status: 400 }
    );
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      {
        error: `That's over ${MAX_CHARS.toLocaleString()} characters. Please trim it down and try again.`,
      },
      { status: 400 }
    );
  }

  let userId: string | null = null;
  if (clerkConfigured()) {
    try {
      userId = (await auth()).userId;
    } catch {
      userId = null;
    }
  }

  // Cache first — identical documents return instantly, however they arrive.
  const cached = await getCached(text);
  if (cached) {
    if (userId && cached.id) await recordHistory(userId, cached.id);
    return NextResponse.json({ analysis: cached });
  }

  // Metered only past this point: everything above either failed validation or
  // was served from cache, and neither costs a model call.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const subject = userId
    ? ({ kind: "user", id: userId } as const)
    : ({ kind: "anon", id: await visitorId() } as const);
  const allowance = await checkAllowance(subject, ip);
  if (!allowance.ok) {
    logInfo("analyze.refused", { requestId, reason: allowance.reason, kind: subject.kind });
    return refusal(allowance, requestId);
  }

  try {
    const started = Date.now();
    const analysis = await runAnalysis({ text, sourceType, sourceUrl, titleHint, userId });
    clearFailure("openai");
    logInfo("analyze.ok", {
      requestId,
      chars: text.length,
      sourceType,
      verdict: analysis.verdict,
      flags: analysis.flags.length,
      stored: Boolean(analysis.id),
      ms: Date.now() - started,
    });
    return NextResponse.json({ analysis, requestId });
  } catch (e) {
    // Classify from the SDK's structured fields rather than matching words in
    // the message, which changes without notice.
    const app = e instanceof AppError ? e : classifyOpenAI(e);
    logError("analyze.failed", app, { requestId, chars: text.length, sourceType });
    return NextResponse.json(
      { error: app.userMessage, code: app.code, retryable: app.retryable, requestId },
      { status: app.status }
    );
  }
}
