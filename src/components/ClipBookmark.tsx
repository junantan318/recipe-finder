"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus } from "lucide-react";

// Source of the "Save to Recipe Box" bookmark. It runs on the recipe page you're viewing,
// so pages that block the app (e.g. Cloudflare checks) are read from your own browser, the
// same way you see them. It opens the app with that page (Back returns to it); nothing is saved until
// you click Save there.
function bookmarkletSource(origin: string): string {
  const code = `(()=>{const f=document.createElement('form');f.method='POST';f.action='${origin}/api/clip';f.acceptCharset='utf-8';const i=document.createElement('input');i.type='hidden';i.name='payload';i.value=JSON.stringify({url:location.href,html:document.documentElement.outerHTML});f.appendChild(i);document.body.appendChild(f);f.submit();f.remove();})()`;
  return `javascript:${encodeURIComponent(code)}`;
}

export default function ClipBookmark({ compact = false }: { compact?: boolean }) {
  const link = useRef<HTMLAnchorElement>(null);
  const [hint, setHint] = useState(false);

  // React refuses to render javascript: URLs, so the href is set directly on the element.
  useEffect(() => {
    link.current?.setAttribute("href", bookmarkletSource(window.location.origin));
  }, []);

  return (
    <div className={compact ? "" : "rounded-xl border border-line bg-paper/60 p-4"}>
      {!compact && (
        <>
          <p className="field-label">Site won’t import? Save it from your browser</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Some recipe sites block apps but not people. Drag this button to your bookmarks bar once. Then, on any recipe
            page, click it to send that page here.
          </p>
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          ref={link}
          draggable
          onClick={(e) => {
            e.preventDefault();
            setHint(true);
          }}
          className="inline-flex cursor-grab items-center gap-1.5 rounded-lg border border-basil/40 bg-basil-soft px-3 py-1.5 text-[13px] font-semibold text-basil active:cursor-grabbing"
        >
          <BookmarkPlus className="h-4 w-4" /> Save to Recipe Box
        </a>
        <span className={`text-[12px] ${hint ? "text-saffron" : "text-muted"}`}>
          {hint ? "Drag it to the bookmarks bar (Ctrl+Shift+B shows the bar)." : "Drag to your bookmarks bar"}
        </span>
      </div>
    </div>
  );
}
