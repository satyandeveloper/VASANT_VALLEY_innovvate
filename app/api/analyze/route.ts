import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, recordHistory, runAnalysis } from "@/lib/pipeline";
import { checkRateLimit } from "@/lib/ratelimit";
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json(
      { error: "You're going fast — try again in a few minutes." },
      { status: 429 }
    );
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
