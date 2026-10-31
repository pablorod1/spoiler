import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, Layers, Sparkles, Users } from "lucide-react";
import { getCollection, getDetails } from "@/lib/tmdb/api";
import { personHref } from "@/lib/tmdb/normalize";
import { formatDate, formatMoney, formatRuntime, formatShortDate, year } from "@/lib/format";
import { TmdbImage } from "@/components/ui/tmdb-image";
import { Rating } from "@/components/ui/rating";
import { Rail } from "@/components/media/rail";
import { MediaCard } from "@/components/media/media-card";
import { PersonCard } from "@/components/media/person-card";
import { TrailerButton } from "@/components/media/trailer-button";
import { WhereToWatch } from "./where-to-watch";
import type { MediaDetails, MediaType } from "@/lib/tmdb/types";

const languageNames = new Intl.DisplayNames(["es"], { type: "language" });
const langName = (code: string) => {
  try {
    const n = languageNames.of(code);
    return n ? n[0].toUpperCase() + n.slice(1) : code;
  } catch {
    return code;
  }
};

const STATUS: Record<string, string> = {
  Released: "Estrenada",
  "Post Production": "Postproducción",
  "In Production": "En producción",
  Planned: "Anunciada",
  Rumored: "Rumoreada",
  Canceled: "Cancelada",
  "Returning Series": "En emisión",
  Ended: "Finalizada",
  "In production": "En producción",
  Pilot: "Piloto",
};

export async function DetailPage({ type, id }: { type: MediaType; id: number }) {
  const m = await getDetails(type, id);
  if (!m) notFound();

  const people = type === "movie" ? m.directors : m.creators;
  const peopleLabel = type === "movie" ? (m.directors.length > 1 ? "Dirección" : "Director") : "Creación";
  const meta = [
    year(m.date),
    m.certification && (/^\d+$/.test(m.certification) ? `+${m.certification}` : m.certification),
    type === "movie"
      ? formatRuntime(m.runtime)
      : m.number_of_seasons && `${m.number_of_seasons} temporada${m.number_of_seasons > 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <main>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden">
        {m.backdrop_path && (
          <Image
            src={m.backdrop_path}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover object-[center_20%] opacity-60"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/80 to-bg/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/40 to-bg/60" />

        <div className="container-page grid gap-8 pb-10 pt-24 md:grid-cols-[260px_1fr] md:gap-12 md:pb-16 md:pt-32 lg:grid-cols-[300px_1fr]">
          <div className="relative mx-auto aspect-[2/3] w-48 overflow-hidden rounded-2xl bg-surface shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)] ring-1 ring-white/10 md:w-full">
            <TmdbImage path={m.poster_path} alt={m.title} fill priority sizes="(min-width:1024px) 300px, (min-width:768px) 260px, 192px" className="object-cover" />
          </div>

          <div className="flex flex-col justify-end animate-fade-up">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              {type === "movie" ? "Película" : "Serie"}
              {m.status && STATUS[m.status] && type === "tv" && ` · ${STATUS[m.status]}`}
            </p>
            {m.logo ? (
              <h1 className="mb-5">
                <span className="sr-only">{m.title}</span>
                <Image
                  src={m.logo.file_path}
                  alt=""
                  width={500}
                  height={Math.round(500 / m.logo.aspect_ratio)}
                  sizes="(min-width:768px) 460px, 80vw"
                  className="h-auto max-h-40 w-auto max-w-[min(460px,85vw)] object-contain object-left drop-shadow-[0_4px_24px_rgb(0_0_0/0.6)]"
                />
              </h1>
            ) : (
              <h1 className="mb-3 text-4xl font-black tracking-tight text-balance md:text-5xl lg:text-6xl">{m.title}</h1>
            )}
            {m.original_title && m.original_title !== m.title && (
              <p className="-mt-1 mb-3 text-sm text-muted">Título original: {m.original_title}</p>
            )}

            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/80">
              {meta.map((v, i) => (
                <span key={i} className="flex items-center gap-3">
                  {i > 0 && <span className="size-1 rounded-full bg-white/30" />}
                  {v}
                </span>
              ))}
              {m.genres.length > 0 && <span className="size-1 rounded-full bg-white/30" />}
              <span className="flex flex-wrap gap-1.5">
                {m.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/${type === "movie" ? "peliculas" : "series"}?generos=${g.id}`}
                    className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs hover:bg-white/15"
                  >
                    {g.name}
                  </Link>
                ))}
              </span>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="grid size-14 place-items-center rounded-full border-2 border-current bg-black/40 backdrop-blur" aria-hidden>
                  <Rating value={m.vote_average} votes={m.vote_count} size="lg" className="[&>svg]:hidden" />
                </div>
                <div className="text-xs leading-tight text-muted">
                  <p className="font-semibold text-fg">Nota TMDB</p>
                  <p>{m.vote_count.toLocaleString("es-ES")} votos</p>
                </div>
              </div>
              {m.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${m.imdb_id}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#f5c518] px-2 py-1 text-xs font-black text-black hover:brightness-110"
                >
                  IMDb <ExternalLink className="size-3" />
                </a>
              )}
            </div>

            {m.tagline && <p className="mb-3 text-lg font-medium italic text-white/90 text-pretty">“{m.tagline}”</p>}
            {m.overview && (
              <p className="mb-6 max-w-3xl text-base leading-relaxed text-white/75 text-pretty">{m.overview}</p>
            )}

            {people.length > 0 && (
              <p className="mb-6 text-sm text-muted">
                <span className="text-subtle">{peopleLabel}: </span>
                {people.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ", "}
                    <Link href={personHref(p)} className="font-medium text-fg hover:text-accent">
                      {p.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {m.trailer && <TrailerButton videoKey={m.trailer.key} title={m.title} />}
              {m.homepage && (
                <a
                  href={m.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold backdrop-blur-md hover:bg-white/20"
                >
                  Web oficial <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Body ---------- */}
      <div className="container-page grid items-start gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <Suspense fallback={<div className="skeleton h-48 rounded-2xl" />}>
            <WhereToWatch availability={m.availability} title={m.title} />
          </Suspense>
          {type === "tv" && <NextEpisode m={m} />}
          {type === "tv" && m.seasons && m.seasons.length > 0 && <Seasons m={m} />}
        </div>
        <Facts m={m} type={type} />
      </div>

      {m.cast.length > 0 && (
        <Rail title="Reparto" icon={<Users className="size-5 text-accent" />} itemClassName="w-[28%] sm:w-[20%] md:w-[14%] lg:w-[11%] xl:w-[9%]">
          {m.cast.slice(0, 24).map((c) => (
            <PersonCard key={c.id} person={c} role={c.character} />
          ))}
        </Rail>
      )}

      {m.collection && (
        <Suspense fallback={null}>
          <CollectionRail id={m.collection.id} currentId={m.id} />
        </Suspense>
      )}

      {m.recommendations.length > 0 && (
        <Rail title="Si te gusta, también te gustará" icon={<Sparkles className="size-5 text-accent" />}>
          {m.recommendations.slice(0, 20).map((r) => (
            <MediaCard key={r.id} media={r} />
          ))}
        </Rail>
      )}
    </main>
  );
}

function Facts({ m, type }: { m: MediaDetails; type: MediaType }) {
  const rows: [string, React.ReactNode][] = [
    ["Estado", STATUS[m.status] ?? m.status],
    [type === "movie" ? "Estreno" : "Primera emisión", formatDate(m.date)],
    ["Idioma original", m.original_language && langName(m.original_language)],
    ...(type === "tv"
      ? ([
          ["Episodios", m.number_of_episodes],
          ["Duración episodio", formatRuntime(m.runtime)],
          ["Cadena", m.networks?.map((n) => n.name).join(", ")],
        ] as [string, React.ReactNode][])
      : ([
          ["Presupuesto", formatMoney(m.budget)],
          ["Recaudación", formatMoney(m.revenue)],
        ] as [string, React.ReactNode][])),
    ["Guion", m.writers.map((w) => w.name).join(", ")],
  ];
  const visible = rows.filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== 0);

  return (
    <section className="rounded-2xl border border-line bg-surface/50 p-5 md:p-6">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Ficha</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
        {visible.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-subtle">{k}</dt>
            <dd className="text-right text-fg/90">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function NextEpisode({ m }: { m: MediaDetails }) {
  const next = m.next_episode_to_air;
  if (!next) return null;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <CalendarClock className="size-5" />
      </div>
      <div className="text-sm">
        <p className="font-semibold">
          Próximo episodio: T{next.season_number} · E{next.episode_number}
          {next.name && !/^Episod(e|io) \d+$/i.test(next.name) && ` — ${next.name}`}
        </p>
        <p className="text-muted">{next.air_date ? formatDate(next.air_date) : "Fecha por confirmar"}</p>
      </div>
    </div>
  );
}

function Seasons({ m }: { m: MediaDetails }) {
  const seasons = [...(m.seasons ?? [])].reverse();
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Layers className="size-5 text-accent" /> Temporadas
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {seasons.map((s) => (
          <li key={s.id} className="flex gap-4 rounded-xl border border-line bg-surface/50 p-3">
            <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <TmdbImage path={s.poster_path ?? m.poster_path} alt={s.name} fill sizes="92px" className="object-cover" />
            </div>
            <div className="min-w-0 py-1">
              <p className="font-medium">{s.name}</p>
              <p className="mt-0.5 text-xs text-subtle">
                {[year(s.air_date), `${s.episode_count} episodios`].filter(Boolean).join(" · ")}
              </p>
              {s.vote_average > 0 && <Rating value={s.vote_average} className="mt-1.5" />}
              {s.overview && <p className="mt-1.5 line-clamp-2 text-xs text-muted">{s.overview}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function CollectionRail({ id, currentId }: { id: number; currentId: number }) {
  const col = await getCollection(id);
  if (!col || col.parts.length < 2) return null;
  return (
    <Rail title={col.name} icon={<Layers className="size-5 text-accent" />}>
      {col.parts.map((p) => (
        <div key={p.id} className={p.id === currentId ? "rounded-xl ring-2 ring-accent ring-offset-4 ring-offset-bg" : undefined}>
          <MediaCard media={p} subtitle={p.date ? formatShortDate(p.date) + " " + year(p.date) : "Próximamente"} />
        </div>
      ))}
    </Rail>
  );
}

