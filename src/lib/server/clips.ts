import { randomUUID } from "node:crypto";
import type { ImportResponse } from "../types.ts";

// Pages sent by the "Save to Recipe Box" bookmark wait here until the app tab picks them up.
// Nothing is saved to the database until the user clicks Save in the preview.
const TTL_MS = 15 * 60 * 1000;
const g = globalThis as unknown as { __recipeClips?: Map<string, { at: number; result: ImportResponse }> };
const clips = (g.__recipeClips ??= new Map());

export function putClip(result: ImportResponse): string {
  const now = Date.now();
  for (const [id, c] of clips) if (now - c.at > TTL_MS) clips.delete(id);
  const id = randomUUID();
  clips.set(id, { at: now, result });
  return id;
}

export function getClip(id: string): ImportResponse | null {
  return clips.get(id)?.result ?? null;
}
