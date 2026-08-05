import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getById } from "@/lib/pipeline";
import { ShareImage, shareFonts } from "./share-image";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const analysis = id ? await getById(id) : null;
  if (!analysis) {
    return new Response("Not found", { status: 404 });
  }

  const fonts = await shareFonts();
  return new ImageResponse(<ShareImage analysis={analysis} />, {
    width: 1200,
    height: 630,
    // An empty list would make satori throw; omitting the option lets it fall
    // back to its own default rather than failing the request.
    ...(fonts.length ? { fonts } : {}),
  });
}
