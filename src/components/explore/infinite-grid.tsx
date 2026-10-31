"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { MediaCard } from "@/components/media/media-card";
import type { MediaSummary, Paged } from "@/lib/tmdb/types";

export const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

/** First page is server-rendered; next pages load as the user scrolls. */
export function InfiniteGrid({
  initial,
  endpoint,
}: {
  initial: Paged<MediaSummary>;
  endpoint: string; // "/api/discover?tipo=movie&..." (without page)
}) {
  const [items, setItems] = useState(initial.results);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const done = page >= initial.total_pages;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        setLoading(true);
        setError(false);
        try {
          const res = await fetch(`${endpoint}&page=${page + 1}`);
          if (!res.ok) throw new Error();
          const data: Paged<MediaSummary> = await res.json();
          setItems((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            return [...prev, ...data.results.filter((m) => !seen.has(m.id))];
          });
          setPage(data.page);
        } catch {
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [endpoint, page, done, loading]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line py-20 text-center">
        <p className="text-lg font-medium">Nada por aquí</p>
        <p className="mt-1 text-sm text-muted">Prueba a quitar algún filtro.</p>
      </div>
    );
  }

  return (
    <>
      <div className={GRID}>
        {items.map((m, i) => (
          <MediaCard key={m.id} media={m} priority={i < 6} />
        ))}
      </div>
      <div ref={sentinel} className="flex h-24 items-center justify-center text-sm text-subtle">
        {loading && <LoaderCircle className="size-6 animate-spin" />}
        {error && <span>No se pudo cargar más. Vuelve a hacer scroll para reintentar.</span>}
        {done && items.length > 20 && <span>Has llegado al final.</span>}
      </div>
    </>
  );
}
