import { emptyDraft, type FieldName, type FieldSource, type RecipeDraft, type SourceText, type Tag } from "../types.ts";
import type { RecipePatch } from "./db.ts";

// Request bodies come from our own UI, but still get shaped before reaching the database.

const PLATFORMS = ["instagram", "youtube", "web", "manual"] as const;
const FIELDS: FieldName[] = ["title", "creator", "thumbnail", "ingredients", "steps"];
const SOURCES: FieldSource[] = ["page", "caption", "description", "linked-page", "transcript", "oembed", "manual"];

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const lines = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 2000)).slice(0, 300) : []);

function tags(v: unknown): Tag[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is Tag => !!t && typeof t === "object" && typeof (t as Tag).name === "string")
    .map((t) => ({ name: t.name.trim().toLowerCase().slice(0, 32), origin: (["source", "inferred", "manual"].includes(t.origin) ? t.origin : "manual") as Tag["origin"] }))
    .filter((t) => t.name)
    .slice(0, 40);
}

function sourceTexts(v: unknown): SourceText[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is SourceText => !!s && typeof s === "object" && typeof (s as SourceText).text === "string")
    .map((s) => ({ kind: s.kind, text: s.text.slice(0, 100_000), ...(typeof s.url === "string" ? { url: s.url } : {}) }));
}

function fieldSources(v: unknown): Partial<Record<FieldName, FieldSource>> {
  const out: Partial<Record<FieldName, FieldSource>> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v)) {
      if (FIELDS.includes(k as FieldName) && SOURCES.includes(val as FieldSource)) out[k as FieldName] = val as FieldSource;
    }
  }
  return out;
}

const uncertain = (v: unknown) => lines(v).filter((f): f is FieldName => FIELDS.includes(f as FieldName));

export function toDraft(body: unknown): RecipeDraft {
  const b = (body ?? {}) as Record<string, unknown>;
  const d = emptyDraft(PLATFORMS.includes(b.platform as never) ? (b.platform as RecipeDraft["platform"]) : "manual");
  d.title = str(b.title, 300);
  d.url = typeof b.url === "string" && /^https?:\/\//.test(b.url) ? b.url : null;
  d.sourceKey = typeof b.sourceKey === "string" ? b.sourceKey : null;
  d.creator = str(b.creator, 200);
  d.thumbnailUrl = typeof b.thumbnailUrl === "string" ? b.thumbnailUrl : null;
  d.thumbnailData = typeof b.thumbnailData === "string" && b.thumbnailData.startsWith("data:image/") ? b.thumbnailData : null;
  d.ingredients = lines(b.ingredients);
  d.steps = lines(b.steps);
  d.tags = tags(b.tags);
  d.notes = str(b.notes, 20_000);
  d.sourceTexts = sourceTexts(b.sourceTexts);
  d.fieldSources = fieldSources(b.fieldSources);
  d.uncertain = uncertain(b.uncertain);
  d.warnings = lines(b.warnings);
  return d;
}

export function toPatch(body: unknown): RecipePatch & { thumbnailData?: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const p: RecipePatch & { thumbnailData?: string } = {};
  if ("title" in b) p.title = str(b.title, 300);
  if ("creator" in b) p.creator = str(b.creator, 200);
  if ("ingredients" in b) p.ingredients = lines(b.ingredients);
  if ("steps" in b) p.steps = lines(b.steps);
  if ("tags" in b) p.tags = tags(b.tags);
  if ("notes" in b) p.notes = str(b.notes, 20_000);
  if ("starred" in b) p.starred = !!b.starred;
  if ("fieldSources" in b) p.fieldSources = fieldSources(b.fieldSources);
  if ("uncertain" in b) p.uncertain = uncertain(b.uncertain);
  if ("sourceTexts" in b) p.sourceTexts = sourceTexts(b.sourceTexts);
  if (typeof b.thumbnailData === "string" && b.thumbnailData.startsWith("data:image/")) p.thumbnailData = b.thumbnailData;
  return p;
}
