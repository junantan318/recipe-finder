"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ClipboardPaste, ExternalLink, Link2, Loader2, PenLine, X } from "lucide-react";
import { emptyDraft, type ImportResponse, type Recipe, type RecipeDraft } from "@/lib/types";
import { detectSource, PLATFORM_LABEL } from "@/lib/url";
import RecipeEditor from "./RecipeEditor";
import { Banner, Overlay, PlatformIcon, SourceBadge, Thumbnail, formatDate } from "./ui";

type Step =
  | { name: "enter"; error?: string }
  | { name: "importing"; url: string }
  | { name: "duplicate"; recipe: Recipe }
  | { name: "preview"; outcome: ImportResponse["outcome"] | "manual" }
  | { name: "saving" };

const PROGRESS: Record<string, string[]> = {
  web: ["Opening the page…", "Looking for recipe data…"],
  youtube: ["Getting the video details…", "Reading the description…", "Checking linked recipe pages…", "Fetching the transcript…"],
  instagram: ["Reading the public post…", "Picking out ingredients and steps…"],
};

export default function AddRecipeDialog({
  open,
  onClose,
  onSaved,
  onOpenExisting,
  ytDlp,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
  onOpenExisting: (recipe: Recipe) => void;
  ytDlp: string | null | undefined;
}) {
  const [step, setStep] = useState<Step>({ name: "enter" });
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [saveError, setSaveError] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setStep({ name: "enter" });
      setUrl("");
      setDraft(null);
      setSaveError("");
    } else {
      abort.current?.abort();
    }
  }, [open]);

  const detected = detectSource(url);

  async function runImport() {
    if (!detected) {
      setStep({ name: "enter", error: "That doesn't look like a link. Paste the full address, starting with https://" });
      return;
    }
    setStep({ name: "importing", url: detected.canonicalUrl });
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: abort.current.signal,
      });
      const data = (await res.json()) as ImportResponse & { error?: string };
      if (data.duplicate) return setStep({ name: "duplicate", recipe: data.duplicate });
      if (!data.draft) return setStep({ name: "enter", error: data.error ?? "Import failed." });
      setDraft(data.draft);
      setStep({ name: "preview", outcome: data.outcome });
    } catch (err) {
      if ((err as Error).name === "AbortError") return setStep({ name: "enter" });
      setStep({ name: "enter", error: "Couldn't reach the app's server. Is it still running?" });
    }
  }

  function startManual() {
    const d = emptyDraft("manual");
    setDraft(d);
    setStep({ name: "preview", outcome: "manual" });
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim() && !draft.url) {
      setSaveError("Give the recipe a title before saving.");
      return;
    }
    setSaveError("");
    const outcome = step.name === "preview" ? step.outcome : "manual";
    setStep({ name: "saving" });
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (res.status === 409) return setStep({ name: "duplicate", recipe: data.duplicate as Recipe });
    if (!res.ok) {
      setSaveError(data.error ?? "Saving failed.");
      return setStep({ name: "preview", outcome });
    }
    onSaved(data as Recipe);
  }

  const busy = step.name === "importing" || step.name === "saving";

  return (
    <Overlay open={open} onClose={busy ? () => {} : onClose} label="Add recipe">
      <header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
        {step.name === "preview" || step.name === "duplicate" ? (
          <button type="button" className="btn-ghost -ml-2 px-2" onClick={() => setStep({ name: "enter" })} aria-label="Back to link">
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <h2 className="font-display text-[19px] font-bold tracking-tight">
          {step.name === "preview" && step.outcome === "manual" ? "New recipe" : step.name === "preview" ? "Check and save" : "Add recipe"}
        </h2>
        <button type="button" className="btn-ghost -mr-2 ml-auto px-2" onClick={onClose} disabled={busy} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {step.name === "enter" && (
          <EnterLink url={url} setUrl={setUrl} onSubmit={runImport} onManual={startManual} error={step.error} ytDlp={ytDlp} />
        )}
        {step.name === "importing" && <Importing url={step.url} platform={detected?.platform ?? "web"} onCancel={() => abort.current?.abort()} />}
        {step.name === "saving" && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Saving…
          </div>
        )}
        {step.name === "duplicate" && (
          <Duplicate recipe={step.recipe} onOpen={() => onOpenExisting(step.recipe)} onAnother={() => { setUrl(""); setStep({ name: "enter" }); }} />
        )}
        {step.name === "preview" && draft && (
          <div className="space-y-5">
            <OutcomeBanner outcome={step.outcome} draft={draft} />
            <RecipeEditor value={draft} onChange={setDraft} />
          </div>
        )}
      </div>

      {step.name === "preview" && (
        <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-surface px-5 py-3 sm:px-6">
          {saveError && <p className="text-[13px] text-danger">{saveError}</p>}
          <span className="hidden text-[12px] text-muted sm:inline">You can edit everything later too.</span>
          <button type="button" className="btn-primary ml-auto" onClick={save}>
            Save recipe
          </button>
        </footer>
      )}
    </Overlay>
  );
}

function EnterLink({
  url,
  setUrl,
  onSubmit,
  onManual,
  error,
  ytDlp,
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: () => void;
  onManual: () => void;
  error?: string;
  ytDlp: string | null | undefined;
}) {
  const detected = detectSource(url);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  async function pasteFromClipboard() {
    try {
      setUrl((await navigator.clipboard.readText()).trim());
    } catch {
      input.current?.focus();
    }
  }

  return (
    <form
      className="space-y-5 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label htmlFor="recipe-url" className="field-label">
          Recipe link
        </label>
        <p className="mb-2 mt-0.5 text-[13px] text-muted">An Instagram post or Reel, a YouTube video or Short, or a recipe web page.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {detected ? <PlatformIcon platform={detected.platform} className="h-4 w-4" /> : <Link2 className="h-4 w-4 text-muted" />}
            </span>
            <input
              id="recipe-url"
              ref={input}
              className="input h-11 pl-9 pr-24 text-[15px]"
              value={url}
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.instagram.com/reel/…"
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="button" onClick={pasteFromClipboard} className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted hover:bg-ink/5 hover:text-ink">
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste
            </button>
          </div>
          <button type="submit" className="btn-primary h-11 px-5" disabled={!url.trim()}>
            Import
          </button>
        </div>
        <p className="mt-2 min-h-[20px] text-[13px]">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : detected ? (
            <span className="text-muted">
              {PLATFORM_LABEL[detected.platform]} link detected
              {detected.platform === "instagram" && ytDlp === null && " — Instagram reading needs yt-dlp (see README); you can still paste the caption."}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <button type="button" className="btn-quiet w-full" onClick={onManual}>
        <PenLine className="h-4 w-4" /> Type in a recipe without a link
      </button>
    </form>
  );
}

function Importing({ url, platform, onCancel }: { url: string; platform: string; onCancel: () => void }) {
  const messages = PROGRESS[platform] ?? PROGRESS.web;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, messages.length - 1)), 2500);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div className="flex flex-col items-center py-14 text-center" role="status" aria-live="polite">
      <Loader2 className="h-7 w-7 animate-spin text-basil" />
      <p className="mt-4 font-display text-[17px] font-semibold">{messages[i]}</p>
      <p className="mt-1 max-w-full truncate px-4 font-mono text-[12px] text-muted">{url}</p>
      <p className="mt-3 text-[12px] text-muted">Videos can take up to 20 seconds.</p>
      <button type="button" className="btn-ghost mt-4" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function Duplicate({ recipe, onOpen, onAnother }: { recipe: Recipe; onOpen: () => void; onAnother: () => void }) {
  return (
    <div className="space-y-4 py-2">
      <Banner tone="info" title="You've already saved this one">
        Saved on {formatDate(recipe.importedAt)}. Open it to edit, rather than saving a second copy.
      </Banner>
      <div className="flex items-center gap-4 rounded-xl border border-line p-3">
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg">
          <Thumbnail recipe={recipe} />
        </div>
        <div className="min-w-0">
          <SourceBadge platform={recipe.platform} />
          <p className="mt-1 truncate font-display text-[16px] font-semibold">{recipe.title}</p>
          {recipe.creator && <p className="text-[13px] text-muted">{recipe.creator}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={onOpen}>
          Open saved recipe
        </button>
        <button type="button" className="btn-quiet" onClick={onAnother}>
          Import a different link
        </button>
      </div>
    </div>
  );
}

function OutcomeBanner({ outcome, draft }: { outcome: ImportResponse["outcome"] | "manual"; draft: RecipeDraft }) {
  if (outcome === "manual") return null;
  const tone = outcome === "complete" ? "ok" : outcome === "partial" ? "warn" : "error";
  const title =
    outcome === "complete"
      ? "Recipe found — check it over and save"
      : outcome === "partial"
        ? "Partly imported — fill in the gaps"
        : "Couldn't read this link";
  return (
    <Banner tone={tone} title={title}>
      {outcome === "failed" && <p>The link will still be saved with the recipe. Paste the caption below or type the recipe in.</p>}
      {draft.warnings.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {draft.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {draft.url && (
        <a href={draft.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-basil hover:underline">
          Open original <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </Banner>
  );
}
