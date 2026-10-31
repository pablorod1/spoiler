import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Bookmark, Heart, Star } from "lucide-react";
import { getSession } from "@/lib/session";
import { getContinueWatching, getLibrary, getLibraryCounts, type LibraryView } from "@/lib/library/queries";
import { MediaCard } from "@/components/media/media-card";
import { ProgressCard } from "@/components/library/progress-card";
import { GRID } from "@/components/explore/infinite-grid";
import { GridSkeleton } from "@/components/ui/skeletons";
import { stars } from "@/lib/library/types";
import { cn } from "@/lib/cn";
import type { MediaSummary, MediaType } from "@/lib/tmdb/types";

export const metadata: Metadata = { title: "Mi lista", robots: { index: false } };

const VIEWS: { key: LibraryView; label: string }[] = [
  { key: "pendientes", label: "Pendientes" },
  { key: "viendo", label: "Viendo" },
  { key: "vistas", label: "Vistas" },
  { key: "valoradas", label: "Valoradas" },
  { key: "favoritas", label: "Favoritas" },
];
const TYPES = [
  { key: undefined, label: "Todo" },
  { key: "pelicula", label: "Películas" },
  { key: "serie", label: "Series" },
] as const;

export default function Page({ searchParams }: PageProps<"/mi-lista">) {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <h1 className="mb-6 text-3xl font-black tracking-tight md:text-4xl">Mi lista</h1>
      <Suspense fallback={<GridSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/mi-lista">, "searchParams">) {
  const session = await getSession();
  if (!session) return <SignedOut />;

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const view = (VIEWS.find((v) => v.key === one(sp.vista))?.key ?? "pendientes") as LibraryView;
  const tipo = one(sp.tipo);
  const type: MediaType | undefined = tipo === "pelicula" ? "movie" : tipo === "serie" ? "tv" : undefined;
  const userId = session.user.id;

  const [counts, rows, progress] = await Promise.all([
    getLibraryCounts(userId),
    getLibrary(userId, view, type),
    view === "viendo" && type !== "movie" ? getContinueWatching(userId, 50) : Promise.resolve([]),
  ]);

  const href = (v: LibraryView, t?: string) => {
    const p = new URLSearchParams();
    if (v !== "pendientes") p.set("vista", v);
    if (t) p.set("tipo", t);
    const qs = p.toString();
    return qs ? `/mi-lista?${qs}` : "/mi-lista";
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <nav className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0" aria-label="Secciones">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={href(v.key, tipo)}
            aria-current={view === v.key ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 pb-3 text-sm font-medium transition",
              view === v.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {v.label}
            <span className="ml-1.5 text-xs tabular-nums text-subtle">{counts[v.key]}</span>
          </Link>
        ))}
      </nav>
      <div className="mb-8 flex gap-2">
        {TYPES.map((t) => (
          <Link
            key={t.label}
            href={href(view, t.key)}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3.5 text-[13px] font-medium transition",
              tipo === t.key || (!tipo && !t.key) ? "border-white bg-white text-black" : "border-line bg-surface text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {progress.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Series en curso</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {progress.map((p) => (
              <ProgressCard key={p.show.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {rows.length > 0 && !(view === "viendo" && progress.length && type !== "movie") ? (
        <div className={GRID}>
          {rows.map((r) => {
            const media: MediaSummary = {
              id: r.tmdbId,
              media_type: r.mediaType,
              title: r.title,
              original_title: r.title,
              overview: "",
              poster_path: r.posterPath,
              backdrop_path: r.backdropPath,
              vote_average: 0,
              vote_count: 0,
              popularity: 0,
              date: r.releaseDate,
              genre_ids: [],
              original_language: "",
            };
            return (
              <MediaCard
                key={`${r.mediaType}-${r.tmdbId}`}
                media={media}
                showType={!type}
                badge={
                  r.rating ? (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <Star className="size-3 fill-current" /> {stars(r.rating)}
                    </span>
                  ) : r.favorite ? (
                    <Heart className="size-3 fill-rose-400 text-rose-400" />
                  ) : undefined
                }
              />
            );
          })}
        </div>
      ) : rows.length === 0 ? (
        <Empty view={view} first={total === 0} />
      ) : null}
    </>
  );
}

function Empty({ view, first }: { view: LibraryView; first: boolean }) {
  const text: Record<LibraryView, string> = {
    pendientes: "Pulsa «Mi lista» en cualquier ficha para guardarla aquí.",
    viendo: "Marca episodios en la ficha de una serie para seguirla desde aquí.",
    vistas: "Lo que marques como visto aparecerá aquí.",
    valoradas: "Valora películas y series con estrellas desde su ficha.",
    favoritas: "Pulsa el corazón en una ficha para guardarla como favorita.",
  };
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <Bookmark className="mx-auto mb-4 size-8 text-subtle" />
      <p className="text-lg font-medium">{first ? "Tu lista está vacía" : "Nada por aquí todavía"}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{text[view]}</p>
      <Link href="/peliculas" className="mt-6 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90">
        Explorar títulos
      </Link>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 px-6 py-16 text-center">
      <Bookmark className="mx-auto mb-4 size-8 text-accent" />
      <p className="text-xl font-semibold">Guarda lo que quieres ver</p>
      <p className="mx-auto mt-2 max-w-md text-muted">
        Crea tu cuenta gratis para tener tu lista, tus valoraciones y el seguimiento de tus series en todos tus dispositivos.
      </p>
      <Link href="/entrar?volver=/mi-lista" className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg hover:brightness-110">
        Entrar o crear cuenta
      </Link>
    </div>
  );
}
