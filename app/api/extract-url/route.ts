import { NextRequest, NextResponse } from "next/server";
import { extractFromUrl, ExtractError } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.url) {
    return NextResponse.json({ error: "No link provided." }, { status: 400 });
  }
  try {
    const { text, title } = await extractFromUrl(body.url);
    return NextResponse.json({ text, title });
  } catch (e) {
    const message =
      e instanceof ExtractError
        ? e.message
        : "That site wouldn't let us read the page — paste the text instead.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
