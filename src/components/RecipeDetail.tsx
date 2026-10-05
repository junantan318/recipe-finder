"use client";

import { useState } from "react";
import { Check, ChevronDown, ExternalLink, Loader2, Pencil, Star, Trash2, X } from "lucide-react";
import { isComplete, type FieldName, type Recipe } from "@/lib/types";
import { countItems, isSectionHeading, splitQuantity } from "@/lib/text-parse";
import RecipeEditor, { type EditorValue } from "./RecipeEditor";
import { Banner, Provenance, SourceBadge, TagChip, Thumbnail, formatDate } from "./ui";

export default function RecipeDetail({
  recipe,
  onClose,
  onChange,
  onDelete,
}: {
  recipe: Recipe;
  onClose: () => void;
  onChange: (r: Recipe) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState<EditorValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Saving failed");
      onChange((await res.json()) as Recipe);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const { title, creator, ingredients, steps, tags, notes, fieldSources, uncertain, sourceTexts, thumbnailData } = editing;
    const ok = await patch({ title, creator, ingredients, steps, tags, notes, fieldSources, uncertain, sourceTexts, ...(thumbnailData ? { thumbnailData } : {}) });
    if (ok) setEditing(null);
  }

  async function remove() {
    if (!window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) return;
    const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    if (res.ok) onDelete(recipe.id);
  }

  const confirmField = (f: FieldName) => patch({ uncertain: recipe.uncertain.filter((x) => x !== f) });

  if (editing) {
    return (
      <>
        <header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="font-display text-[19px] font-bold tracking-tight">Edit recipe</h2>
          <button type="button" className="btn-ghost -mr-2 ml-auto px-2" onClick={() => setEditing(null)} aria-label="Cancel editing">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <RecipeEditor value={editing} onChange={setEditing} existingThumb={recipe.hasThumbnail ? `/api/recipes/${recipe.id}/thumbnail?v=${encodeURIComponent(recipe.updatedAt)}` : null} />
        </div>
        <footer className="flex items-center gap-3 border-t border-line px-5 py-3 sm:px-6">
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <button type="button" className="btn-quiet ml-auto" onClick={() => setEditing(null)} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={saveEdit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </footer>
      </>
    );
  }

  const fs = recipe.fieldSources;
  const unsure = (f: FieldName) => recipe.uncertain.includes(f);
  const startEdit = () => setEditing({ ...recipe, thumbnailData: null });

  return (
    <>
      <div className="relative h-56 shrink-0 bg-paper sm:h-64">
        <Thumbnail recipe={recipe} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <SourceBadge platform={recipe.platform} overlay />
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white/95 p-2 text-ink shadow-sm hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-7 px-5 pb-10 pt-5 sm:px-7">
          <div>
            <div className="flex items-start gap-2">
              <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">{recipe.title}</h2>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">
              {recipe.creator && <span>by {recipe.creator}</span>}
              <span>Saved {formatDate(recipe.importedAt)}</span>
              {unsure("title") && (
                <span className="inline-flex items-center gap-1">
                  <Provenance source={fs.title} uncertain />
                  <button type="button" className="text-[12px] text-basil hover:underline" onClick={startEdit}>
                    Edit title
                  </button>
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.url && (
                <a href={recipe.url} target="_blank" rel="noreferrer" className="btn-primary">
                  Open original <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button type="button" className="btn-quiet" onClick={() => patch({ starred: !recipe.starred })} aria-pressed={recipe.starred}>
                <Star className={`h-4 w-4 ${recipe.starred ? "fill-saffron text-saffron" : ""}`} /> {recipe.starred ? "Starred" : "Star"}
              </button>
              <button type="button" className="btn-quiet" onClick={startEdit}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button type="button" className="btn-ghost ml-auto text-danger hover:bg-danger-soft hover:text-danger" onClick={remove}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
            {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
          </div>

          {!isComplete(recipe) && (
            <Banner tone="warn" title="Needs details">
              <p>
                {recipe.ingredients.length ? "" : "No ingredients yet. "}
                {recipe.steps.length ? "" : "No steps yet. "}
                Paste the caption or type them in.{" "}
                <button type="button" className="font-medium text-basil hover:underline" onClick={startEdit}>
                  Add details
                </button>
              </p>
            </Banner>
          )}

          <Section title="Ingredients" count={countItems(recipe.ingredients)} source={fs.ingredients} uncertain={unsure("ingredients")} onConfirm={() => confirmField("ingredients")}>
            {recipe.ingredients.length ? (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {recipe.ingredients.map((line, i) => {
                  const heading = isSectionHeading(line);
                  const { qty, rest } = splitQuantity(line);
                  // Only use a quantity column when lines start with quantities ("2 cups cream"),
                  // not for "Cream - 2 cups" style lists.
                  const qtyColumn = recipe.ingredients.filter((l) => splitQuantity(l).qty).length >= recipe.ingredients.length / 2;
                  return heading ? (
                    <li key={i} className="bg-paper/70 px-3 py-1.5 font-display text-[13px] font-semibold">{line}</li>
                  ) : !qtyColumn ? (
                    <li key={i} className="px-3 py-2 text-[14px]">{line}</li>
                  ) : (
                    <li key={i} className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2 text-[14px]">
                      <span className="font-mono text-[13px] font-medium text-basil">{qty}</span>
                      <span>{rest}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>No ingredients saved.</Empty>
            )}
          </Section>

          <Section title="Steps" count={countItems(recipe.steps)} source={fs.steps} uncertain={unsure("steps")} onConfirm={() => confirmField("steps")}>
            {recipe.steps.length ? (
              <ol className="space-y-3">
                {(() => {
                  let n = 0;
                  return recipe.steps.map((line, i) =>
                    isSectionHeading(line) ? (
                      <li key={i} className="pt-1 font-display text-[14px] font-semibold">{line}</li>
                    ) : (
                      <li key={i} className="grid grid-cols-[28px_1fr] gap-2 text-[15px] leading-relaxed">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-basil-soft font-mono text-[12px] font-medium text-basil">{++n}</span>
                        <span>{line}</span>
                      </li>
                    ),
                  );
                })()}
              </ol>
            ) : (
              <Empty>No steps saved.</Empty>
            )}
          </Section>

          {recipe.tags.length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map((t) => (
                  <TagChip key={t.name} tag={t} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Notes">
            {recipe.notes ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{recipe.notes}</p> : <Empty>No notes yet.</Empty>}
          </Section>

          {(recipe.sourceTexts.length > 0 || recipe.warnings.length > 0) && (
            <Section title="From the source">
              <div className="space-y-2">
                {recipe.sourceTexts.map((s, i) => (
                  <details key={i} className="group rounded-lg border border-line">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-medium">
                      <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
                      {{ caption: "Caption", description: "Video description", transcript: "Transcript", page: "Page summary", pasted: "Pasted text" }[s.kind]}
                      {s.url && <span className="truncate font-mono text-[11px] text-muted">{new URL(s.url).hostname}</span>}
                    </summary>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-line px-3 py-2 font-sans text-[13px] leading-relaxed text-ink/80">{s.text}</pre>
                  </details>
                ))}
                {recipe.warnings.length > 0 && (
                  <details className="group rounded-lg border border-line">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-medium">
                      <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
                      Import notes
                    </summary>
                    <ul className="list-disc space-y-1 border-t border-line py-2 pl-8 pr-3 text-[13px] text-ink/80">
                      {recipe.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  count,
  source,
  uncertain,
  onConfirm,
  children,
}: {
  title: string;
  count?: number;
  source?: Recipe["fieldSources"]["title"];
  uncertain?: boolean;
  onConfirm?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[17px] font-bold tracking-tight">{title}</h3>
        {!!count && <span className="font-mono text-[12px] text-muted">{count}</span>}
        <span className="ml-auto inline-flex items-center gap-2">
          <Provenance source={source} uncertain={uncertain} />
          {uncertain && onConfirm && (
            <button type="button" onClick={onConfirm} className="inline-flex items-center gap-1 text-[12px] font-medium text-basil hover:underline">
              <Check className="h-3.5 w-3.5" /> Looks right
            </button>
          )}
        </span>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] text-muted">{children}</p>;
}
