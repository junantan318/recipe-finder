// Optional: loads the 25 Allrecipes recipes from the original project as clearly labelled
// samples (tag "sample"). Safe to run twice — recipes already saved are skipped.
// Usage: npm run seed:samples
import { readFileSync } from "node:fs";
import { createRecipe, findBySourceKey, DATA_DIR } from "../src/lib/server/db.ts";
import { fetchImageDataUrl } from "../src/lib/server/fetch.ts";
import { detectSource } from "../src/lib/url.ts";
import { inferTags, mergeTags } from "../src/lib/tags.ts";
import { emptyDraft } from "../src/lib/types.ts";

interface Legacy {
  title: string;
  image?: string;
  sourceUrl: string;
  ingredients: string[];
  instructions: string[];
  cuisine?: string;
  category?: string;
}

const samples = JSON.parse(readFileSync(new URL("../legacy/allrecipes-sample.json", import.meta.url), "utf8")) as Legacy[];
let added = 0;
for (const s of samples) {
  const source = detectSource(s.sourceUrl);
  if (!source || findBySourceKey(source.key)) continue;
  const draft = emptyDraft("web");
  draft.title = s.title;
  draft.url = source.canonicalUrl;
  draft.sourceKey = source.key;
  draft.creator = "Allrecipes";
  draft.ingredients = s.ingredients;
  // The old scraper captured photo credits between steps.
  draft.steps = s.instructions.filter((l) => !/food studios|^photo by|^gather all ingredients\.?$/i.test(l));
  draft.fieldSources = { title: "page", creator: "page", ingredients: "page", steps: "page" };
  draft.tags = mergeTags(
    { names: ["sample"], origin: "manual" },
    { names: inferTags(s.title, s.ingredients), origin: "inferred" },
  );
  draft.notes = "Sample recipe from the original recipe-finder project (scraped from Allrecipes).";
  draft.thumbnailUrl = s.image ?? null;
  draft.thumbnailData = await fetchImageDataUrl(draft.thumbnailUrl);
  createRecipe(draft);
  added++;
}
console.log(`Added ${added} sample recipes to ${DATA_DIR}`);
