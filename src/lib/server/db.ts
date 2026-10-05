import Database from "better-sqlite3";
import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FieldName, FieldSource, Platform, Recipe, RecipeDraft, SourceText, Tag } from "../types.ts";

// Data lives outside the repo (and outside OneDrive) so sync can't lock the database.
// Override with RECIPE_BOX_DATA_DIR.
export const DATA_DIR =
  process.env.RECIPE_BOX_DATA_DIR ||
  path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), ".local", "share"), "recipe-box");
const THUMB_DIR = path.join(DATA_DIR, "thumbs");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recipes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  platform      TEXT NOT NULL,
  url           TEXT,
  source_key    TEXT UNIQUE,
  creator       TEXT NOT NULL DEFAULT '',
  thumb_file    TEXT,
  thumb_url     TEXT,
  ingredients   TEXT NOT NULL DEFAULT '[]',
  steps         TEXT NOT NULL DEFAULT '[]',
  tags          TEXT NOT NULL DEFAULT '[]',
  notes         TEXT NOT NULL DEFAULT '',
  source_texts  TEXT NOT NULL DEFAULT '[]',
  field_sources TEXT NOT NULL DEFAULT '{}',
  uncertain     TEXT NOT NULL DEFAULT '[]',
  warnings      TEXT NOT NULL DEFAULT '[]',
  starred       INTEGER NOT NULL DEFAULT 0,
  imported_at   TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
`;

// Reuse one connection across Next.js hot reloads in development.
const g = globalThis as unknown as { __recipeDb?: Database.Database };

export function db(): Database.Database {
  if (!g.__recipeDb) {
    mkdirSync(THUMB_DIR, { recursive: true });
    const conn = new Database(path.join(DATA_DIR, "recipes.db"));
    conn.pragma("journal_mode = WAL");
    conn.exec(SCHEMA);
    g.__recipeDb = conn;
  }
  return g.__recipeDb;
}

interface Row {
  id: number;
  title: string;
  platform: string;
  url: string | null;
  source_key: string | null;
  creator: string;
  thumb_file: string | null;
  thumb_url: string | null;
  ingredients: string;
  steps: string;
  tags: string;
  notes: string;
  source_texts: string;
  field_sources: string;
  uncertain: string;
  warnings: string;
  starred: number;
  imported_at: string;
  updated_at: string;
}

function toRecipe(r: Row): Recipe {
  return {
    id: r.id,
    title: r.title,
    platform: r.platform as Platform,
    url: r.url,
    sourceKey: r.source_key,
    creator: r.creator,
    thumbnailUrl: r.thumb_url,
    hasThumbnail: !!r.thumb_file,
    ingredients: JSON.parse(r.ingredients) as string[],
    steps: JSON.parse(r.steps) as string[],
    tags: JSON.parse(r.tags) as Tag[],
    notes: r.notes,
    sourceTexts: JSON.parse(r.source_texts) as SourceText[],
    fieldSources: JSON.parse(r.field_sources) as Partial<Record<FieldName, FieldSource>>,
    uncertain: JSON.parse(r.uncertain) as FieldName[],
    warnings: JSON.parse(r.warnings) as string[],
    starred: !!r.starred,
    importedAt: r.imported_at,
    updatedAt: r.updated_at,
  };
}

export function listRecipes(): Recipe[] {
  return (db().prepare("SELECT * FROM recipes ORDER BY imported_at DESC, id DESC").all() as Row[]).map(toRecipe);
}

export function getRecipe(id: number): Recipe | null {
  const row = db().prepare("SELECT * FROM recipes WHERE id = ?").get(id) as Row | undefined;
  return row ? toRecipe(row) : null;
}

export function findBySourceKey(key: string): Recipe | null {
  const row = db().prepare("SELECT * FROM recipes WHERE source_key = ?").get(key) as Row | undefined;
  return row ? toRecipe(row) : null;
}

const clean = (lines: string[]) => lines.map((l) => l.trim()).filter(Boolean);

export function createRecipe(d: RecipeDraft): Recipe {
  const now = new Date().toISOString();
  const info = db()
    .prepare(
      `INSERT INTO recipes (title, platform, url, source_key, creator, thumb_url, ingredients, steps, tags, notes,
        source_texts, field_sources, uncertain, warnings, imported_at, updated_at)
       VALUES (@title, @platform, @url, @sourceKey, @creator, @thumbnailUrl, @ingredients, @steps, @tags, @notes,
        @sourceTexts, @fieldSources, @uncertain, @warnings, @now, @now)`,
    )
    .run({
      title: d.title.trim() || "Untitled recipe",
      platform: d.platform,
      url: d.url,
      sourceKey: d.sourceKey,
      creator: d.creator.trim(),
      thumbnailUrl: d.thumbnailUrl,
      ingredients: JSON.stringify(clean(d.ingredients)),
      steps: JSON.stringify(clean(d.steps)),
      tags: JSON.stringify(d.tags),
      notes: d.notes,
      sourceTexts: JSON.stringify(d.sourceTexts),
      fieldSources: JSON.stringify(d.fieldSources),
      uncertain: JSON.stringify(d.uncertain),
      warnings: JSON.stringify(d.warnings),
      now,
    });
  const id = Number(info.lastInsertRowid);
  if (d.thumbnailData) saveThumbnail(id, d.thumbnailData);
  return getRecipe(id)!;
}

export type RecipePatch = Partial<
  Pick<Recipe, "title" | "creator" | "ingredients" | "steps" | "tags" | "notes" | "starred" | "fieldSources" | "uncertain" | "sourceTexts">
>;

export function updateRecipe(id: number, patch: RecipePatch): Recipe | null {
  const current = getRecipe(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  db()
    .prepare(
      `UPDATE recipes SET title=@title, creator=@creator, ingredients=@ingredients, steps=@steps, tags=@tags,
        notes=@notes, starred=@starred, field_sources=@fieldSources, uncertain=@uncertain,
        source_texts=@sourceTexts, updated_at=@now WHERE id=@id`,
    )
    .run({
      id,
      title: next.title.trim() || "Untitled recipe",
      creator: next.creator.trim(),
      ingredients: JSON.stringify(clean(next.ingredients)),
      steps: JSON.stringify(clean(next.steps)),
      tags: JSON.stringify(next.tags),
      notes: next.notes,
      starred: next.starred ? 1 : 0,
      fieldSources: JSON.stringify(next.fieldSources),
      uncertain: JSON.stringify(next.uncertain),
      sourceTexts: JSON.stringify(next.sourceTexts),
      now: new Date().toISOString(),
    });
  return getRecipe(id);
}

export function deleteRecipe(id: number): boolean {
  const row = db().prepare("SELECT thumb_file FROM recipes WHERE id = ?").get(id) as { thumb_file: string | null } | undefined;
  if (!row) return false;
  db().prepare("DELETE FROM recipes WHERE id = ?").run(id);
  if (row.thumb_file) {
    const file = path.join(THUMB_DIR, row.thumb_file);
    if (existsSync(file)) unlinkSync(file);
  }
  return true;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

export function saveThumbnail(id: number, dataUrl: string): void {
  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!m || !EXT[m[1]]) return;
  const file = `${id}.${EXT[m[1]]}`;
  writeFileSync(path.join(THUMB_DIR, file), Buffer.from(m[2], "base64"));
  db().prepare("UPDATE recipes SET thumb_file = ? WHERE id = ?").run(file, id);
}

export function readThumbnail(id: number): { type: string; bytes: Buffer } | null {
  const row = db().prepare("SELECT thumb_file FROM recipes WHERE id = ?").get(id) as { thumb_file: string | null } | undefined;
  if (!row?.thumb_file) return null;
  const file = path.join(THUMB_DIR, row.thumb_file);
  if (!existsSync(file)) return null;
  const ext = path.extname(file).slice(1);
  const type = Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? "image/jpeg";
  return { type, bytes: readFileSync(file) };
}
