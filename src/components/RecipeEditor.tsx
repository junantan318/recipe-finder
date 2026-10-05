"use client";

import { useRef, useState } from "react";
import { ChevronDown, ExternalLink, ImagePlus, Wand2 } from "lucide-react";
import type { FieldName, FieldSource, RecipeDraft, SourceTextKind, Tag } from "@/lib/types";
import { firstLineTitle, parseRecipeText } from "@/lib/text-parse";
import { inferTags, mergeTags, normaliseTag, sourceTags } from "@/lib/tags";
import { Provenance, TagChip, Thumbnail } from "./ui";

export type EditorValue = RecipeDraft;

const TEXT_KIND_LABEL: Record<SourceTextKind, string> = {
  caption: "Caption",
  description: "Video description",
  transcript: "Transcript",
  page: "Page summary",
  pasted: "Pasted text",
};

export default function RecipeEditor({
  value,
  onChange,
  existingThumb,
}: {
  value: EditorValue;
  onChange: (next: EditorValue) => void;
  existingThumb?: string | null;
}) {
  // Keep raw textarea text so blank lines survive while typing; empty lines are dropped on save.
  const [ingredientsText, setIngredientsText] = useState(value.ingredients.join("\n"));
  const [stepsText, setStepsText] = useState(value.steps.join("\n"));

  function setField<K extends keyof EditorValue>(key: K, v: EditorValue[K], field?: FieldName) {
    const next = { ...value, [key]: v };
    if (field) {
      // Editing a field counts as reviewing it; a field filled in from nothing is the user's.
      next.uncertain = value.uncertain.filter((f) => f !== field);
      if (!value.fieldSources[field]) next.fieldSources = { ...value.fieldSources, [field]: "manual" as FieldSource };
    }
    onChange(next);
  }

  function applyParsed(next: EditorValue) {
    setIngredientsText(next.ingredients.join("\n"));
    setStepsText(next.steps.join("\n"));
    onChange(next);
  }

  const fs = value.fieldSources;
  const unsure = (f: FieldName) => value.uncertain.includes(f);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <ImagePicker
          src={value.thumbnailData ?? existingThumb ?? null}
          source={fs.thumbnail}
          onPick={(data) => onChange({ ...value, thumbnailData: data, fieldSources: { ...fs, thumbnail: "manual" } })}
        />
        <div className="space-y-4">
          <Field label="Title" source={fs.title} uncertain={unsure("title")}>
            <input
              className="input font-display text-[17px] font-semibold"
              value={value.title}
              placeholder="e.g. Creamy chicken Alfredo"
              onChange={(e) => setField("title", e.target.value, "title")}
            />
          </Field>
          <Field label="Creator" source={fs.creator}>
            <input className="input" value={value.creator} placeholder="Who made it" onChange={(e) => setField("creator", e.target.value, "creator")} />
          </Field>
        </div>
      </div>

      <Field label="Ingredients" hint="One per line, as written" source={fs.ingredients} uncertain={unsure("ingredients")}>
        <textarea
          className="input min-h-[150px] font-mono text-[13px] leading-6"
          value={ingredientsText}
          placeholder={"250g fettuccine\n2 chicken breasts\n1 cup heavy cream"}
          onChange={(e) => {
            setIngredientsText(e.target.value);
            setField("ingredients", e.target.value.split("\n"), "ingredients");
          }}
        />
      </Field>

      <Field label="Steps" hint="One per line" source={fs.steps} uncertain={unsure("steps")}>
        <textarea
          className="input min-h-[150px] text-[14px] leading-6"
          value={stepsText}
          placeholder={"Cook the pasta in salted water.\nSear the chicken…"}
          onChange={(e) => {
            setStepsText(e.target.value);
            setField("steps", e.target.value.split("\n"), "steps");
          }}
        />
      </Field>

      <Field label="Tags" hint="Dashed tags were inferred — remove any that don't fit">
        <TagEditor tags={value.tags} onChange={(tags) => setField("tags", tags)} />
      </Field>

      <Field label="Notes" hint="Only you see these">
        <textarea
          className="input min-h-[80px] text-[14px]"
          value={value.notes}
          placeholder="Tweaks, what to serve it with, how it turned out…"
          onChange={(e) => setField("notes", e.target.value)}
        />
      </Field>

      <SourceTexts value={value} onApply={applyParsed} />
    </div>
  );
}

function Field({
  label,
  hint,
  source,
  uncertain,
  children,
}: {
  label: string;
  hint?: string;
  source?: FieldSource;
  uncertain?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="field-label">{label}</span>
        {hint && <span className="text-[12px] text-muted">{hint}</span>}
        <span className="ml-auto">
          <Provenance source={source} uncertain={uncertain} />
        </span>
      </span>
      {children}
    </label>
  );
}

function ImagePicker({ src, source, onPick }: { src: string | null; source?: FieldSource; onPick: (dataUrl: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <div>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line sm:aspect-square">
        <Thumbnail src={src} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="absolute inset-x-2 bottom-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/95 px-2 py-1.5 text-[12px] font-medium text-ink opacity-90 shadow-sm transition hover:opacity-100"
        >
          <ImagePlus className="h-3.5 w-3.5" /> {src ? "Change image" : "Add image"}
        </button>
      </div>
      <div className="mt-1.5 min-h-[18px]">{source && src && <Provenance source={source} />}</div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 4 * 1024 * 1024) {
            setError("Choose an image under 4 MB.");
            return;
          }
          setError("");
          const reader = new FileReader();
          reader.onload = () => onPick(String(reader.result));
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: Tag[]; onChange: (tags: Tag[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const names = draft.split(",").map(normaliseTag).filter(Boolean);
    const next = [...tags];
    for (const name of names) if (!next.some((t) => t.name === name)) next.push({ name, origin: "manual" });
    onChange(next);
    setDraft("");
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface p-2 focus-within:border-basil focus-within:ring-2 focus-within:ring-basil/15">
      {tags.map((t) => (
        <TagChip key={t.name} tag={t} onRemove={() => onChange(tags.filter((x) => x.name !== t.name))} />
      ))}
      <input
        className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-[13px] outline-none placeholder:text-muted/70"
        value={draft}
        placeholder={tags.length ? "Add tag" : "Add tags, e.g. pasta, weeknight"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add()}
      />
    </div>
  );
}

type PasteKind = "caption" | "transcript" | "pasted";
const PASTE_KINDS: { kind: PasteKind; label: string; source: FieldSource }[] = [
  { kind: "caption", label: "Caption", source: "caption" },
  { kind: "transcript", label: "Transcript", source: "transcript" },
  { kind: "pasted", label: "Recipe text", source: "manual" },
];

// Shows the raw text kept from the source, and lets the user paste a caption/transcript
// to fill in the recipe when extraction found nothing.
function SourceTexts({ value, onApply }: { value: EditorValue; onApply: (next: EditorValue) => void }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<PasteKind>(value.platform === "instagram" ? "caption" : "pasted");
  const [message, setMessage] = useState("");
  const missing = !value.ingredients.some((l) => l.trim()) || !value.steps.some((l) => l.trim());

  function fill() {
    const parsed = parseRecipeText(text);
    const source = PASTE_KINDS.find((k) => k.kind === kind)!.source;
    const next: EditorValue = {
      ...value,
      fieldSources: { ...value.fieldSources },
      uncertain: [...value.uncertain],
      sourceTexts: [...value.sourceTexts, { kind, text }],
    };
    const hasIng = value.ingredients.some((l) => l.trim());
    const hasSteps = value.steps.some((l) => l.trim());
    const replace =
      hasIng && hasSteps && (parsed.ingredients.length || parsed.steps.length)
        ? window.confirm("This recipe already has ingredients and steps. Replace them with what was found in the pasted text?")
        : false;
    const filled: string[] = [];
    if (parsed.ingredients.length && (!hasIng || replace)) {
      next.ingredients = parsed.ingredients;
      next.fieldSources.ingredients = source;
      next.uncertain = next.uncertain.filter((f) => f !== "ingredients");
      if (parsed.ingredientsFound === "pattern") next.uncertain.push("ingredients");
      filled.push(`${parsed.ingredients.length} ingredients`);
    }
    if (parsed.steps.length && (!hasSteps || replace)) {
      next.steps = parsed.steps;
      next.fieldSources.steps = source;
      next.uncertain = next.uncertain.filter((f) => f !== "steps");
      if (parsed.stepsFound === "pattern") next.uncertain.push("steps");
      filled.push(`${parsed.steps.length} steps`);
    }
    if (!value.title.trim()) {
      const title = firstLineTitle(text);
      if (title) {
        next.title = title;
        next.fieldSources.title = source;
        next.uncertain.push("title");
        filled.push("the title");
      }
    }
    next.tags = mergeTags(
      { names: value.tags.map((t) => t.name), origin: "manual" },
      { names: sourceTags(parsed.hashtags), origin: "source" },
      { names: inferTags(next.title, next.ingredients), origin: "inferred" },
    ).map((t) => value.tags.find((x) => x.name === t.name) ?? t);
    onApply(next);
    setText("");
    setMessage(
      filled.length
        ? `Filled in ${filled.join(", ")}. The text is kept below for reference.`
        : "No ingredient or step lists were found in that text. It's kept below — copy what you need into the fields above.",
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-paper/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="field-label">Source text</span>
        <span className="text-[12px] text-muted">Kept as it came from the source</span>
      </div>

      {value.sourceTexts.map((s, i) => (
        <details key={i} className="group rounded-lg border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-medium">
            <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
            {TEXT_KIND_LABEL[s.kind]}
            <span className="font-mono text-[11px] text-muted">{s.text.length.toLocaleString()} chars</span>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12px] text-basil hover:underline" onClick={(e) => e.stopPropagation()}>
                {new URL(s.url).hostname} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </summary>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-line px-3 py-2 font-sans text-[13px] leading-relaxed text-ink/80">{s.text}</pre>
        </details>
      ))}

      <details className="group rounded-lg border border-dashed border-ink/20 bg-surface" open={missing && value.sourceTexts.length === 0}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-medium">
          <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
          Paste a caption or transcript
        </summary>
        <div className="space-y-2 border-t border-line p-3">
          <div className="inline-flex rounded-lg border border-line p-0.5" role="radiogroup" aria-label="What are you pasting?">
            {PASTE_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                role="radio"
                aria-checked={kind === k.kind}
                onClick={() => setKind(k.kind)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${kind === k.kind ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <textarea
            className="input min-h-[120px] text-[13px]"
            value={text}
            placeholder="Paste the post caption, video description or transcript here."
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-quiet" disabled={!text.trim()} onClick={fill}>
              <Wand2 className="h-4 w-4" /> Fill in from this text
            </button>
            <span className="text-[12px] text-muted">Lines are copied as written. Nothing is made up.</span>
          </div>
        </div>
      </details>
      {message && <p className="text-[13px] text-ink/80" role="status">{message}</p>}
    </div>
  );
}
