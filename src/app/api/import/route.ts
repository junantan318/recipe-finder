import { NextResponse } from "next/server";
import { importFromUrl } from "@/lib/server/extract.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const { url } = (await request.json()) as { url?: unknown };
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "Paste a link to import." }, { status: 400 });
  }
  return NextResponse.json(await importFromUrl(url));
}
