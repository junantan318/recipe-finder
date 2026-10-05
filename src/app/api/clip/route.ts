import { importFromUrl } from "@/lib/server/extract.ts";
import { putClip } from "@/lib/server/clips.ts";

export const dynamic = "force-dynamic";

const MAX_HTML = 8 * 1024 * 1024;

// Receives the page you're viewing from the "Save to Recipe Box" bookmark (a form POST from
// your browser), runs the normal importer on it, and opens the preview in the app.
export async function POST(request: Request) {
  const form = await request.formData();
  let payload: { url?: unknown; html?: unknown };
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return new Response("The bookmark sent something unexpected. Try reinstalling it from the app.", { status: 400 });
  }
  const url = typeof payload.url === "string" ? payload.url : "";
  const html = typeof payload.html === "string" ? payload.html.slice(0, MAX_HTML) : undefined;
  if (!url) return new Response("No page address was sent.", { status: 400 });

  const result = await importFromUrl(url, html);
  const id = putClip(result);
  return Response.redirect(new URL(`/?clip=${id}`, request.url), 303);
}
