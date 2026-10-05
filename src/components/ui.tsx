"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Globe, Instagram, PenLine, Youtube, X, ChefHat } from "lucide-react";
import type { FieldSource, Platform, Recipe, Tag } from "@/lib/types";
import { PLATFORM_LABEL } from "@/lib/url";

const PLATFORM_STYLE: Record<Platform, { icon: typeof Globe; color: string }> = {
  instagram: { icon: Instagram, color: "text-ig" },
  youtube: { icon: Youtube, color: "text-yt" },
  web: { icon: Globe, color: "text-web" },
  manual: { icon: PenLine, color: "text-manual" },
};

export function PlatformIcon({ platform, className = "h-3.5 w-3.5" }: { platform: Platform; className?: string }) {
  const { icon: Icon, color } = PLATFORM_STYLE[platform];
  return <Icon className={`${className} ${color}`} aria-hidden />;
}

export function SourceBadge({ platform, overlay = false }: { platform: Platform; overlay?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${
        overlay ? "bg-white/95 text-ink shadow-sm backdrop-blur" : "bg-ink/[0.04] text-ink"
      }`}
    >
      <PlatformIcon platform={platform} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}

const SOURCE_LABEL: Record<FieldSource, string> = {
  page: "from page",
  caption: "from caption",
  description: "from description",
  "linked-page": "from linked page",
  transcript: "from transcript",
  oembed: "from platform",
  manual: "added by you",
};

// Provenance stamp: where a field's content came from, and whether it needs checking.
export function Provenance({ source, uncertain }: { source?: FieldSource; uncertain?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {source && <span className="stamp border-line bg-surface text-muted">{SOURCE_LABEL[source]}</span>}
      {uncertain && (
        <span className="stamp border-saffron/40 bg-saffron-soft text-saffron" title="Picked out automatically — check it">
          check this
        </span>
      )}
    </span>
  );
}

export function TagChip({ tag, onRemove, active, onClick }: { tag: Tag; onRemove?: () => void; active?: boolean; onClick?: () => void }) {
  const inferred = tag.origin === "inferred";
  const base = inferred
    ? "border-dashed border-saffron/60 text-ink"
    : "border-line text-ink";
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={inferred ? "Inferred from the title and ingredients" : tag.origin === "source" ? "From the source" : undefined}
      className={`inline-flex items-center gap-1 rounded-full border bg-surface px-2.5 py-0.5 text-[12px] ${base} ${
        active ? "!border-basil !bg-basil !text-white" : ""
      } ${onClick ? "hover:border-ink/30" : ""}`}
    >
      {tag.name}
      {inferred && <span className="font-mono text-[9px] uppercase tracking-wider text-saffron">inferred</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove tag ${tag.name}`} className="-mr-1 rounded-full p-0.5 text-muted hover:bg-ink/5 hover:text-ink">
          <X className="h-3 w-3" />
        </button>
      )}
    </Comp>
  );
}

export function Thumbnail({ recipe, src, className = "" }: { recipe?: Recipe; src?: string | null; className?: string }) {
  const url = src ?? (recipe?.hasThumbnail ? `/api/recipes/${recipe.id}/thumbnail?v=${encodeURIComponent(recipe.updatedAt)}` : null);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-[repeating-linear-gradient(135deg,rgb(var(--paper))_0_10px,#eceef1_10px_20px)] ${className}`}>
      <ChefHat className="h-8 w-8 text-muted/40" aria-hidden />
    </div>
  );
}

// Modal dialog (centered) or side sheet. Closes on Escape and backdrop click.
export function Overlay({
  open,
  onClose,
  children,
  variant = "dialog",
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "dialog" | "sheet";
  label: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Keep focus where a child put it (e.g. an autofocused input); otherwise focus the panel.
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={
          variant === "sheet"
            ? "relative ml-auto flex h-full w-full max-w-[680px] animate-sheet-in flex-col overflow-hidden bg-surface shadow-lift outline-none"
            : "relative m-auto flex max-h-[92vh] w-[calc(100%-32px)] max-w-[760px] animate-rise-in flex-col overflow-hidden rounded-2xl bg-surface shadow-lift outline-none"
        }
      >
        {children}
      </div>
    </div>
  );
}

export function Banner({ tone, title, children }: { tone: "ok" | "warn" | "error" | "info"; title: string; children?: ReactNode }) {
  const styles = {
    ok: "border-basil/25 bg-basil-soft text-basil",
    warn: "border-saffron/30 bg-saffron-soft text-saffron",
    error: "border-danger/25 bg-danger-soft text-danger",
    info: "border-line bg-paper text-ink",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles}`}>
      <p className="text-[14px] font-semibold">{title}</p>
      {children && <div className="mt-1 text-[13px] leading-relaxed text-ink/80">{children}</div>}
    </div>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
