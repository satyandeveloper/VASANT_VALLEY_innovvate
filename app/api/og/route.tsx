import { NextRequest } from "next/server";
import { getById } from "@/lib/analysis/pipeline";
import { renderShareImage } from "./share-image";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const analysis = id ? await getById(id) : null;
  if (!analysis) {
    return new Response("Not found", { status: 404 });
  }
  return renderShareImage(analysis);
}
