import type { Platform } from "./types.ts";

export interface DetectedSource {
  platform: Exclude<Platform, "manual">;
  // Stable identity used for duplicate detection, e.g. "youtube:F7CU0qBdj04".
  key: string;
  // Clean link to store and open.
  canonicalUrl: string;
  // Platform id (YouTube video id, Instagram shortcode) when there is one.
  id?: string;
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|igsh$|igshid$|si$|feature$|ref$|ref_src$|mc_|_ga$)/i;

export function parseUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

export function detectSource(input: string): DetectedSource | null {
  const url = parseUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" && parts[0]) {
    return youtube(parts[0]);
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v) return youtube(v);
    if (["shorts", "embed", "live", "v"].includes(parts[0]) && parts[1]) return youtube(parts[1]);
  }

  if (host === "instagram.com" || host === "instagr.am") {
    // /p/<code>, /reel/<code>, /reels/<code>, /tv/<code>, also /<user>/p/<code>
    const i = parts.findIndex((p) => ["p", "reel", "reels", "tv"].includes(p));
    if (i >= 0 && parts[i + 1]) {
      const code = parts[i + 1];
      const kind = parts[i] === "p" ? "p" : "reel";
      return {
        platform: "instagram",
        key: `instagram:${code}`,
        canonicalUrl: `https://www.instagram.com/${kind}/${code}/`,
        id: code,
      };
    }
  }

  // Any other page: drop tracking params and the fragment.
  const clean = new URL(url.toString());
  clean.hash = "";
  for (const name of [...clean.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(name)) clean.searchParams.delete(name);
  }
  clean.searchParams.sort();
  const path = clean.pathname.replace(/\/+$/, "") || "/";
  const query = clean.searchParams.toString();
  return {
    platform: "web",
    key: `web:${host}${path.toLowerCase()}${query ? `?${query}` : ""}`,
    canonicalUrl: clean.toString(),
  };
}

function youtube(id: string): DetectedSource | null {
  const clean = id.replace(/[^A-Za-z0-9_-]/g, "");
  if (clean.length !== 11) return null;
  return {
    platform: "youtube",
    key: `youtube:${clean}`,
    canonicalUrl: `https://www.youtube.com/watch?v=${clean}`,
    id: clean,
  };
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  web: "Website",
  manual: "Manual",
};
