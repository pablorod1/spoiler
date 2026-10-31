"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Film, Tv, User, ArrowRight, LoaderCircle, CornerDownLeft } from "lucide-react";
import { mediaHref, personHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MediaSummary, PersonSummary } from "@/lib/tmdb/types";

export const OPEN_SEARCH_EVENT = "whatcher:open-search";
export const openSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));

type Item =
  | { kind: "media"; href: string; data: MediaSummary }
  | { kind: "person"; href: string; data: PersonSummary }
  | { kind: "all"; href: string };

export function CommandPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; items: Item[] }>({ q: "", items: [] });
  const [active, setActive] = useState(0);

  const open = useCallback(() => {
    if (dialog.current?.open) return;
    dialog.current?.showModal();
    requestAnimationFrame(() => input.current?.select());
  }, []);
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, open);
    };
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data: { media: MediaSummary[]; people: PersonSummary[] } = await res.json();
        setResults({ q, items: [
          ...data.media.map((m) => ({ kind: "media" as const, href: mediaHref(m), data: m })),
          ...data.people.map((p) => ({ kind: "person" as const, href: personHref(p), data: p })),
          { kind: "all" as const, href: `/buscar?q=${encodeURIComponent(q)}` },
        ] });
        setActive(0);
      } catch {
        if (!ctrl.signal.aborted) setResults({ q, items: [] });
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const q = query.trim();
  const ready = q.length >= 2;
  const items = ready && results.q === q ? results.items : [];
  const busy = ready && results.q !== q;

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) go(item.href);
      else if (query.trim()) go(`/buscar?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <dialog
      ref={dialog}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="mx-auto mt-[10vh] w-[min(640px,94vw)] overflow-hidden rounded-2xl border border-line-strong bg-surface/95 p-0 text-fg shadow-2xl backdrop-blur-xl"
      aria-label="Buscar"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        {busy ? (
          <LoaderCircle className="size-5 shrink-0 animate-spin text-muted" />
        ) : (
          <Search className="size-5 shrink-0 text-muted" />
        )}
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Películas, series, actores…"
          className="h-14 w-full bg-transparent text-base outline-none placeholder:text-subtle"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls="search-results"
          aria-activedescendant={items[active] ? `sr-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-subtle sm:block">esc</kbd>
      </div>

      <ul id="search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
        {query.trim().length < 2 && (
          <li className="px-3 py-8 text-center text-sm text-subtle">
            Escribe al menos dos letras. Pulsa <kbd className="rounded border border-line px-1">/</kbd> o{" "}
            <kbd className="rounded border border-line px-1">⌘K</kbd> en cualquier página.
          </li>
        )}
        {query.trim().length >= 2 && !busy && items.length <= 1 && (
          <li className="px-3 py-8 text-center text-sm text-subtle">Sin resultados para “{query}”.</li>
        )}
        {items.length > 1 &&
          items.map((item, i) => (
            <li
              key={item.href}
              id={`sr-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => go(item.href)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2",
                i === active && "bg-surface-3",
              )}
            >
              {item.kind === "all" ? (
                <>
                  <span className="grid h-12 w-8 place-items-center text-muted">
                    <ArrowRight className="size-4" />
                  </span>
                  <span className="text-sm">Ver todos los resultados de “{query.trim()}”</span>
                </>
              ) : (
                <>
                  <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded-md bg-surface-3">
                    {(item.kind === "media" ? item.data.poster_path : item.data.profile_path) && (
                      <Image
                        src={(item.kind === "media" ? item.data.poster_path : item.data.profile_path)!}
                        alt=""
                        fill
                        sizes="92px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.kind === "media" ? item.data.title : item.data.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-subtle">
                      {item.kind === "media" ? (
                        <>
                          {item.data.media_type === "movie" ? <Film className="size-3" /> : <Tv className="size-3" />}
                          {item.data.media_type === "movie" ? "Película" : "Serie"}
                          {item.data.date && ` · ${year(item.data.date)}`}
                        </>
                      ) : (
                        <>
                          <User className="size-3" />
                          {item.data.known_for_department === "Acting" ? "Interpretación" : item.data.known_for_department}
                          {item.data.known_for[0] && ` · ${item.data.known_for[0].title}`}
                        </>
                      )}
                    </span>
                  </span>
                </>
              )}
              {i === active && <CornerDownLeft className="size-4 shrink-0 text-subtle" />}
            </li>
          ))}
      </ul>
    </dialog>
  );
}
