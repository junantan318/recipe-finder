// Shared types for the recipe collection. Used by both the server and the browser.

export type Platform = "instagram" | "youtube" | "web" | "manual";

// Where a field's value came from. Shown next to each field in the UI.
export type FieldSource =
  | "page" // structured recipe data on a web page
  | "caption" // Instagram caption
  | "description" // YouTube video description
  | "linked-page" // recipe page linked from a video description
  | "transcript"
  | "oembed" // platform metadata (title, creator, thumbnail)
  | "manual";

export type FieldName = "title" | "creator" | "thumbnail" | "ingredients" | "steps";

export type TagOrigin = "source" | "inferred" | "manual";

export interface Tag {
  name: string;
  origin: TagOrigin;
}

export type SourceTextKind = "caption" | "description" | "transcript" | "page" | "pasted";

// Raw text kept exactly as it came from the source, for reference and re-parsing.
export interface SourceText {
  kind: SourceTextKind;
  text: string;
  url?: string;
}

// What the import step returns and the preview edits before saving.
export interface RecipeDraft {
  title: string;
  platform: Platform;
  url: string | null;
  sourceKey: string | null;
  creator: string;
  thumbnailUrl: string | null;
  thumbnailData: string | null; // data: URL fetched at import time
  ingredients: string[];
  steps: string[];
  tags: Tag[];
  notes: string;
  sourceTexts: SourceText[];
  fieldSources: Partial<Record<FieldName, FieldSource>>;
  uncertain: FieldName[];
  warnings: string[];
}

export interface Recipe extends Omit<RecipeDraft, "thumbnailData"> {
  id: number;
  hasThumbnail: boolean;
  starred: boolean;
  importedAt: string;
  updatedAt: string;
}

export type ImportOutcome = "complete" | "partial" | "failed";

export interface ImportResponse {
  duplicate: Recipe | null;
  draft: RecipeDraft | null;
  outcome: ImportOutcome;
  error?: string;
}

export function isComplete(r: { ingredients: string[]; steps: string[] }): boolean {
  return r.ingredients.length > 0 && r.steps.length > 0;
}

export function emptyDraft(platform: Platform = "manual"): RecipeDraft {
  return {
    title: "",
    platform,
    url: null,
    sourceKey: null,
    creator: "",
    thumbnailUrl: null,
    thumbnailData: null,
    ingredients: [],
    steps: [],
    tags: [],
    notes: "",
    sourceTexts: [],
    fieldSources: {},
    uncertain: [],
    warnings: [],
  };
}
