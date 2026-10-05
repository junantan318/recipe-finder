import { NextResponse } from "next/server";
import { getClip } from "@/lib/server/clips.ts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clip = getClip((await params).id);
  return clip ? NextResponse.json(clip) : NextResponse.json({ error: "This clip has expired. Click the bookmark again." }, { status: 404 });
}
