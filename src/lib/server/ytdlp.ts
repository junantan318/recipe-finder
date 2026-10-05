import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// yt-dlp (https://github.com/yt-dlp/yt-dlp) is an optional, free, local tool. It reads
// public Instagram posts and YouTube transcripts the way a logged-out browser does.
// It is never given cookies or credentials, so private posts stay out of reach.

type Command = { file: string; args: string[] };

const CANDIDATES: Command[] = [
  ...(process.env.YTDLP_PATH ? [{ file: process.env.YTDLP_PATH, args: [] }] : []),
  { file: "yt-dlp", args: [] },
  { file: "python", args: ["-m", "yt_dlp"] },
  { file: "py", args: ["-m", "yt_dlp"] },
  { file: "python3", args: ["-m", "yt_dlp"] },
];

function run(cmd: Command, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd.file,
      [...cmd.args, ...args],
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
      (err, stdout, stderr) => {
        if (err) {
          const lastError = stderr.split("\n").filter((l) => l.startsWith("ERROR")).pop();
          reject(new Error(lastError ?? err.message));
        } else resolve(stdout);
      },
    );
  });
}

let found: Promise<{ cmd: Command; version: string } | null> | null = null;

export function findYtDlp(): Promise<{ cmd: Command; version: string } | null> {
  if (!found) {
    found = (async () => {
      for (const cmd of CANDIDATES) {
        try {
          const version = (await run(cmd, ["--version"], 15000)).trim();
          if (/^\d{4}\./.test(version)) return { cmd, version };
        } catch {
          // try the next candidate
        }
      }
      return null;
    })();
  }
  return found;
}

export interface YtDlpInfo {
  title?: string;
  description?: string;
  uploader?: string;
  channel?: string;
  uploader_id?: string;
  thumbnail?: string;
  subtitles?: Record<string, unknown>;
  automatic_captions?: Record<string, unknown>;
}

export async function ytDlpInfo(url: string): Promise<YtDlpInfo> {
  const tool = await findYtDlp();
  if (!tool) throw new Error("yt-dlp is not installed");
  const out = await run(tool.cmd, ["-j", "--skip-download", "--no-warnings", "--no-playlist", url], 60000);
  return JSON.parse(out) as YtDlpInfo;
}

// Downloads English subtitles (creator-written first, then auto-generated) as plain text.
export async function ytDlpTranscript(url: string): Promise<{ text: string; auto: boolean } | null> {
  const tool = await findYtDlp();
  if (!tool) return null;
  const dir = await mkdtemp(path.join(tmpdir(), "recipe-box-subs-"));
  try {
    await run(
      tool.cmd,
      ["--skip-download", "--no-warnings", "--no-playlist", "--write-subs", "--write-auto-subs",
        "--sub-langs", "en.*,en", "--sub-format", "vtt", "-o", path.join(dir, "subs.%(ext)s"), url],
      90000,
    );
    const files = (await readdir(dir)).filter((f) => f.endsWith(".vtt"));
    if (!files.length) return null;
    // Auto-generated tracks are named "en", "en-orig" etc.; creator tracks carry an id suffix
    // like "en-ehkg1hFWq8A". Prefer creator tracks.
    const manual = files.find((f) => /^subs\.en-[A-Za-z0-9_-]{6,}\.vtt$/.test(f) && !f.includes("orig"));
    const pick = manual ?? files.find((f) => f === "subs.en.vtt") ?? files[0];
    const text = vttToText(await readFile(path.join(dir, pick), "utf8"));
    return text ? { text, auto: !manual } : null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Converts WebVTT captions to readable text, removing timing, tags and the rolling
// duplicate lines that auto-generated captions produce.
export function vttToText(vtt: string): string {
  const lines: string[] = [];
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
    if (!line || line === "WEBVTT" || /^(Kind|Language|NOTE|STYLE):?/.test(line) || line.includes("-->") || /^\d+$/.test(line)) continue;
    if (lines.slice(-3).includes(line)) continue;
    lines.push(line);
  }
  // Join into paragraphs of roughly 400 characters for readability.
  const paras: string[] = [];
  let current = "";
  for (const l of lines) {
    current = current ? `${current} ${l}` : l;
    if (current.length > 400 && /[.!?]$/.test(current)) {
      paras.push(current);
      current = "";
    }
  }
  if (current) paras.push(current);
  return paras.join("\n\n");
}
