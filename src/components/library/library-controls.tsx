"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Check, Eye, Heart, ChevronDown, Star } from "lucide-react";
import { setRating, setStatus, toggleFavorite } from "@/lib/library/actions";
import { STATUS_LABEL, stars, type LibraryEntry, type LibraryStatus, type MediaSnapshot } from "@/lib/library/types";
import { cn } from "@/lib/cn";

const EMPTY: LibraryEntry = { status: null, rating: null, favorite: false };

export function LibraryControls({
  media,
  initial,
  loginHref,
}: {
  media: MediaSnapshot;
  initial: LibraryEntry | null;
  /** set when signed out: every interaction sends the user here */
  loginHref?: string;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState<LibraryEntry>(initial ?? EMPTY);
  const [, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const isTv = media.mediaType === "tv";
  const labels = STATUS_LABEL[media.mediaType];

  /** optimistic update + server action, reverting on failure */
  const run = (next: LibraryEntry, action: () => Promise<{ ok: boolean; error?: string }>) => {
    if (loginHref) return router.push(loginHref);
    const prev = entry;
    setEntry(next);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setEntry(prev);
        if (res.error === "auth") router.push(loginHref ?? "/entrar");
      }
    });
  };

  const changeStatus = (status: LibraryStatus | null) => {
    setMenu(false);
    run({ ...entry, status }, () => setStatus(media, status));
  };
  const rate = (rating: number | null) =>
    run(
      { ...entry, rating, status: rating && !isTv && entry.status !== "completed" ? "completed" : entry.status },
      () => setRating(media, rating),
    );

  const inList = entry.status === "watchlist";
  const seen = entry.status === "completed";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => changeStatus(inList ? null : "watchlist")}
        aria-pressed={inList}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold backdrop-blur-md transition active:scale-[0.98]",
          inList ? "border-accent bg-accent text-accent-fg" : "border-white/20 bg-white/10 hover:bg-white/20",
        )}
      >
        {inList ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        {inList ? "En mi lista" : "Mi lista"}
      </button>

      {!isTv ? (
        <button
          type="button"
          onClick={() => changeStatus(seen ? null : "completed")}
          aria-pressed={seen}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold backdrop-blur-md transition active:scale-[0.98]",
            seen ? "border-good bg-good text-black" : "border-white/20 bg-white/10 hover:bg-white/20",
          )}
        >
          {seen ? <Check className="size-4" strokeWidth={3} /> : <Eye className="size-4" />}
          {seen ? "Vista" : "La he visto"}
        </button>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => (loginHref ? router.push(loginHref) : setMenu((m) => !m))}
            aria-expanded={menu}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold backdrop-blur-md transition",
              entry.status && entry.status !== "watchlist"
                ? "border-good/60 bg-good/15 text-good"
                : "border-white/20 bg-white/10 hover:bg-white/20",
            )}
          >
            <Eye className="size-4" />
            {entry.status && entry.status !== "watchlist" ? labels[entry.status] : "Estado"}
            <ChevronDown className="size-4 opacity-60" />
          </button>
          {menu && (
            <div className="absolute left-0 top-12 z-20 w-48 rounded-2xl border border-line-strong bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
              {(["watching", "completed", "dropped"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(entry.status === s ? null : s)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-3"
                >
                  {labels[s]}
                  {entry.status === s && <Check className="size-4 text-good" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => run({ ...entry, favorite: !entry.favorite }, () => toggleFavorite(media, !entry.favorite))}
        aria-pressed={entry.favorite}
        aria-label={entry.favorite ? "Quitar de favoritas" : "Añadir a favoritas"}
        className={cn(
          "grid size-11 place-items-center rounded-full border backdrop-blur-md transition active:scale-95",
          entry.favorite ? "border-rose-500/60 bg-rose-500/15 text-rose-400" : "border-white/20 bg-white/10 hover:bg-white/20",
        )}
      >
        <Heart className={cn("size-4", entry.favorite && "fill-current")} />
      </button>

      <StarRating value={entry.rating} onChange={rate} />
    </div>
  );
}

/** 5 stars with half steps. Stored as 1–10. Click the current value to clear. */
function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-3 pr-4 backdrop-blur-md">
      <div
        className="flex"
        onMouseLeave={() => setHover(null)}
        role="radiogroup"
        aria-label="Tu valoración"
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const full = shown >= i * 2;
          const half = !full && shown >= i * 2 - 1;
          return (
            <span key={i} className="relative size-7">
              <Star className="absolute inset-0.5 size-6 text-white/25" />
              {(full || half) && (
                <span className={cn("absolute inset-0 overflow-hidden", half && "w-1/2")}>
                  <Star className="absolute left-0.5 top-0.5 size-6 fill-accent text-accent" />
                </span>
              )}
              {[i * 2 - 1, i * 2].map((v, k) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  aria-label={`${stars(v)} estrellas`}
                  onMouseEnter={() => setHover(v)}
                  onFocus={() => setHover(v)}
                  onBlur={() => setHover(null)}
                  onClick={() => onChange(value === v ? null : v)}
                  className={cn("absolute inset-y-0 w-1/2 outline-none", k === 0 ? "left-0" : "right-0")}
                />
              ))}
            </span>
          );
        })}
      </div>
      <span className="w-14 text-xs tabular-nums text-muted">
        {shown ? <span className="font-semibold text-fg">{stars(shown)} ★</span> : "Valorar"}
      </span>
    </div>
  );
}
