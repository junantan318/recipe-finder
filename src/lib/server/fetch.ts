// HTTP helpers for import. A normal browser user agent is sent so sites return the same
// page a visitor would see; nothing here logs in or gets past paywalls or login walls.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export interface FetchedPage {
  ok: boolean;
  status: number;
  url: string;
  html: string;
}

export async function fetchPage(url: string, timeoutMs = 15000): Promise<FetchedPage> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();
  return { ok: res.ok, status: res.status, url: res.url, html };
}

export async function fetchJson<T>(url: string, timeoutMs = 10000): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function fetchImage(url: string): Promise<{ type: string; bytes: Buffer } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": UA } });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !type.startsWith("image/")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) return null;
    return { type, bytes };
  } catch {
    return null;
  }
}

export async function fetchImageDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  const img = await fetchImage(url);
  return img ? `data:${img.type};base64,${img.bytes.toString("base64")}` : null;
}

export function describeFetchError(err: unknown): string {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return "the site took too long to respond";
  }
  return err instanceof Error ? err.message : String(err);
}
