import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/server/db.ts";
import { findYtDlp } from "@/lib/server/ytdlp.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const ytDlp = await findYtDlp();
  return NextResponse.json({ ytDlp: ytDlp?.version ?? null, dataDir: DATA_DIR });
}
