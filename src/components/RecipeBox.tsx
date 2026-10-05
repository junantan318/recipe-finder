"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Star, X, CircleAlert } from "lucide-react";
import { isComplete, type Platform, type Recipe } from "@/lib/types";
import { searchRecipes } from "@/lib/search";
import { PLATFORM_LABEL } from "@/lib/url";
import AddRecipeDialog from "./AddRecipeDialog";
import RecipeDetail from "./RecipeDetail";
import { Overlay, PlatformIcon, TagChip, Thumbnail } from "./ui";

type PlatformFilter = Platform | "all";

export default function RecipeBox() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [tags, setTags] = useState<string[]>([]);
  const [starredOnly, setStarredOnly] = useState(false);
  const [needsDetails, setNeedsDetails] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [highlight, setHighlight] = useState<number | null>(null);
  const [ytDlp, setYtDlp] = useState<string | null | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setRecipes)
      .catch((e) => setLoadError(`Couldn't load your recipes (${e.message}).`));
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setYtDlp(s.ytDlp))
      .catch(() => setYtDlp(null));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName);
      if (e.key === "/" && !typing && !adding && openId === null) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding, openId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const all = useMemo(() => recipes ?? [], [recipes]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of all) counts[r.platform] = (counts[r.platform] ?? 0) + 1;
    return counts;
  }, [all]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of all) for (const t of r.tags) counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14).map(([name]) => name);
  }, [all]);

  const visible = useMemo(() => {
    const filtered = all.filter(
      (r) =>
        (platform === "all" || r.platform === platform) &&
        tags.every((t) => r.tags.some((x) => x.name === t)) &&
        (!starredOnly || r.starred) &&
        (!needsDetails || !isComplete(r)),
    );
    return searchRecipes(filtered, query);
  }, [all, platform, tags, starredOnly, needsDetails, query]);

  const filtersOn = platform !== "all" || tags.length > 0 || starredOnly || needsDetails || query.trim() !== "";
  const clearFilters = () => {
    setPlatform("all");
    setTags([]);
    setStarredOnly(false);
    setNeedsDetails(false);
    setQuery("");
  };

  const replace = useCallback((r: Recipe) => setRecipes((list) => (list ?? []).map((x) => (x.id === r.id ? r : x))), []);
  const open = openId !== null ? all.find((r) => r.id === openId) ?? null : null;
  const incompleteCount = all.filter((r) => !isComplete(r)).length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:flex-nowrap sm:px-6">
          <h1 className="shrink-0 font-display text-[20px] font-extrabold tracking-tight sm:text-[22px]">
            Recipe<span className="text-basil">Box</span>
          </h1>
          <div className="relative order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes, ingredients, tags, notes"
              aria-label="Search recipes"
              className="input h-10 rounded-full pl-9 pr-10"
            />
            {!query && (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-muted sm:block">/</kbd>
            )}
          </div>
          <button type="button" className="btn-primary ml-auto h-10 shrink-0 rounded-full px-3 sm:ml-0 sm:px-4" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add recipe link</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-6">
        {loadError && <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">{loadError}</p>}

        {recipes && recipes.length > 0 && (
          <div className="mb-5 space-y-3">
            <div className="-mx-4 flex gap-1.5 no-scrollbar overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <FilterPill active={platform === "all"} onClick={() => setPlatform("all")} label="All" count={all.length} />
              {(["instagram", "youtube", "web", "manual"] as Platform[])
                .filter((p) => platformCounts[p])
                .map((p) => (
                  <FilterPill
                    key={p}
                    active={platform === p}
                    onClick={() => setPlatform(platform === p ? "all" : p)}
                    label={PLATFORM_LABEL[p]}
                    count={platformCounts[p]}
                    icon={<PlatformIcon platform={p} />}
                  />
                ))}
              <span className="mx-1 w-px shrink-0 bg-line" />
              <FilterPill active={starredOnly} onClick={() => setStarredOnly(!starredOnly)} label="Starred" icon={<Star className="h-3.5 w-3.5" />} />
              {incompleteCount > 0 && (
                <FilterPill active={needsDetails} onClick={() => setNeedsDetails(!needsDetails)} label="Needs details" count={incompleteCount} icon={<CircleAlert className="h-3.5 w-3.5 text-saffron" />} />
              )}
            </div>
            {topTags.length > 0 && (
              <div className="-mx-4 flex items-center gap-1.5 no-scrollbar overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Tags</span>
                {topTags.map((name) => (
                  <TagChip
                    key={name}
                    tag={{ name, origin: "manual" }}
                    active={tags.includes(name)}
                    onClick={() => setTags(tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name])}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {recipes === null && !loadError && <SkeletonGrid />}

        {recipes && recipes.length === 0 && <EmptyBox onAdd={() => setAdding(true)} />}

        {recipes && recipes.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-3 text-[13px] text-muted">
              <span aria-live="polite">
                {filtersOn ? `${visible.length} of ${all.length} recipes` : `${all.length} saved recipe${all.length === 1 ? "" : "s"}`}
              </span>
              {filtersOn && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 font-medium text-basil hover:underline">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
                <p className="font-display text-[18px] font-semibold">Nothing matches{query ? ` "${query}"` : ""}</p>
                <p className="mt-1 text-[14px] text-muted">Try another ingredient or dish name, or clear the filters.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((r) => (
                  <li key={r.id}>
                    <RecipeCard recipe={r} highlight={highlight === r.id} onOpen={() => setOpenId(r.id)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <AddRecipeDialog
        open={adding}
        ytDlp={ytDlp}
        onClose={() => setAdding(false)}
        onSaved={(r) => {
          setRecipes((list) => [r, ...(list ?? [])]);
          setAdding(false);
          setHighlight(r.id);
          setToast(isComplete(r) ? `Saved "${r.title}"` : `Saved "${r.title}" — it still needs details`);
        }}
        onOpenExisting={(r) => {
          setAdding(false);
          setOpenId(r.id);
        }}
      />

      <Overlay open={!!open} onClose={() => setOpenId(null)} variant="sheet" label={open?.title ?? "Recipe"}>
        {open && (
          <RecipeDetail
            key={open.id}
            recipe={open}
            onClose={() => setOpenId(null)}
            onChange={replace}
            onDelete={(id) => {
              setRecipes((list) => (list ?? []).filter((x) => x.id !== id));
              setOpenId(null);
              setToast("Recipe deleted");
            }}
          />
        )}
      </Overlay>

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-rise-in rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white shadow-lift">
          {toast}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count?: number; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "border-ink bg-ink text-white [&_svg]:text-current" : "border-line bg-surface text-ink hover:border-ink/30"
      }`}
    >
      {icon}
      {label}
      {count !== undefined && <span className={`font-mono text-[11px] ${active ? "text-white/70" : "text-muted"}`}>{count}</span>}
    </button>
  );
}

function RecipeCard({ recipe, onOpen, highlight }: { recipe: Recipe; onOpen: () => void; highlight: boolean }) {
  const complete = isComplete(recipe);
  const shown = recipe.tags.slice(0, 3);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-surface text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${
        highlight ? "border-basil ring-2 ring-basil/25" : "border-line"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper">
        <Thumbnail recipe={recipe} className="transition duration-300 group-hover:scale-[1.03]" />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium shadow-sm">
          <PlatformIcon platform={recipe.platform} className="h-3 w-3" />
          {PLATFORM_LABEL[recipe.platform]}
        </span>
        {recipe.starred && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 p-1 shadow-sm" aria-label="Starred">
            <Star className="h-3.5 w-3.5 fill-saffron text-saffron" />
          </span>
        )}
        {!complete && (
          <span className="stamp absolute bottom-2.5 left-2.5 border-saffron/40 bg-saffron-soft text-saffron">Needs details</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 font-display text-[16px] font-semibold leading-snug tracking-tight">{recipe.title}</h3>
        {recipe.creator && <p className="truncate text-[13px] text-muted">{recipe.creator}</p>}
        {shown.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1.5">
            {shown.map((t) => (
              <span
                key={t.name}
                className={`rounded-full border px-2 py-[1px] text-[11px] ${t.origin === "inferred" ? "border-dashed border-saffron/60" : "border-line"} text-ink/80`}
              >
                {t.name}
              </span>
            ))}
            {recipe.tags.length > 3 && <span className="px-1 text-[11px] text-muted">+{recipe.tags.length - 3}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="aspect-[4/3] animate-pulse bg-paper" />
          <div className="space-y-2 p-3.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-paper" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-paper" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyBox({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center sm:py-24">
      <div className="mx-auto mb-6 flex w-fit items-center gap-2">
        {(["instagram", "youtube", "web"] as Platform[]).map((p) => (
          <span key={p} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface shadow-card">
            <PlatformIcon platform={p} className="h-5 w-5" />
          </span>
        ))}
      </div>
      <h2 className="font-display text-[30px] font-bold leading-tight tracking-tight sm:text-[36px]">
        Every recipe you saved,
        <br /> in one place you can search.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
        Copy the link to a Reel, a YouTube video or a recipe page, paste it here, and it’s saved with its ingredients, steps and original link.
      </p>
      <button type="button" className="btn-primary mt-7 h-11 rounded-full px-6 text-[15px]" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Add your first recipe link
      </button>
    </div>
  );
}
