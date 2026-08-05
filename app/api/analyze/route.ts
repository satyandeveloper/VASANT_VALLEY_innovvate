import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, recordHistory, runAnalysis } from "@/lib/pipeline";
import { checkRateLimit } from "@/lib/ratelimit";
import { MAX_CHARS, MIN_CHARS } from "@/lib/types";
import { extractFromUrl, ExtractError } from "@/lib/extract";

export const maxDuration = 60;
export const runtime = "nodejs";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export async function POST(req: NextRequest) {
  let body: { text?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
      const message =
        e instanceof ExtractError
          ? e.message
          : "That site wouldn't let us read the page — paste the text instead.";
      return NextResponse.json({ error: message, fallbackToPaste: true }, { status: 422 });
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
    const analysis = await runAnalysis({ text, sourceType, sourceUrl, titleHint, userId });
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error("analysis failed:", e);
    const msg = e instanceof Error ? e.message : "";
    if (/credits|quota|billing/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "The AI account has run out of credits — the site owner needs to top up the OpenAI account. Cached and sample documents still work.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong during analysis. Please retry.", retryable: true },
      { status: 502 }
    );
  }
}
