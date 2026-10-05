// Runs the import pipeline on one or more links and prints what it found, without saving.
// Usage: npm run try-import -- <url> [<url> ...]
import { importFromUrl } from "../src/lib/server/extract.ts";

for (const url of process.argv.slice(2)) {
  const started = Date.now();
  const res = await importFromUrl(url);
  const d = res.draft;
  console.log(`\n=== ${url}  (${((Date.now() - started) / 1000).toFixed(1)}s, ${res.outcome})`);
  if (res.error) console.log("error:", res.error);
  if (res.duplicate) console.log("duplicate of recipe", res.duplicate.id, res.duplicate.title);
  if (!d) continue;
  console.log("title:      ", d.title, `[${d.fieldSources.title ?? "-"}]`);
  console.log("creator:    ", d.creator, `[${d.fieldSources.creator ?? "-"}]`);
  console.log("thumbnail:  ", d.thumbnailData ? `${Math.round(d.thumbnailData.length / 1024)} KB` : "none");
  console.log(`ingredients: ${d.ingredients.length} [${d.fieldSources.ingredients ?? "-"}]`, d.ingredients.slice(0, 4));
  console.log(`steps:       ${d.steps.length} [${d.fieldSources.steps ?? "-"}]`, d.steps.slice(0, 2).map((s) => s.slice(0, 80)));
  console.log("tags:       ", d.tags.map((t) => `${t.name}${t.origin === "inferred" ? "*" : ""}`).join(", "));
  console.log("uncertain:  ", d.uncertain.join(", ") || "-");
  console.log("source text:", d.sourceTexts.map((s) => `${s.kind}(${s.text.length})`).join(", ") || "-");
  for (const w of d.warnings) console.log("warning:    ", w);
}
