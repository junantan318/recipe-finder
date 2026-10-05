import { readThumbnail } from "@/lib/server/db.ts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const thumb = readThumbnail(Number((await params).id));
  if (!thumb) return new Response("No thumbnail", { status: 404 });
  return new Response(new Uint8Array(thumb.bytes), {
    headers: { "Content-Type": thumb.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
