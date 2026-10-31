import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, User } from "lucide-react";
import { getPerson } from "@/lib/tmdb/api";
import { mediaHref } from "@/lib/tmdb/normalize";
import { formatDate, year } from "@/lib/format";
import { TmdbImage } from "@/components/ui/tmdb-image";
import { Rating } from "@/components/ui/rating";
import { Rail } from "@/components/media/rail";
import { MediaCard } from "@/components/media/media-card";
import type { PersonCredit } from "@/lib/tmdb/types";

const DEPT: Record<string, string> = {
  Acting: "Interpretación",
  Directing: "Dirección",
  Writing: "Guion",
  Production: "Producción",
  Sound: "Sonido",
  Camera: "Fotografía",
  Editing: "Montaje",
  Art: "Arte",
  Crew: "Equipo",
};

export async function PersonPage({ id }: { id: number }) {
  const p = await getPerson(id);
  if (!p) notFound();
  const a = p.age;

  const filmography = [
    { key: "cast", label: "Como intérprete", items: p.cast },
    { key: "crew", label: "Detrás de la cámara", items: p.crew },
  ].filter((g) => g.items.length);
  if (p.known_for_department !== "Acting") filmography.reverse();

  return (
    <main className="pt-24 md:pt-28">
      <div className="container-page grid gap-8 md:grid-cols-[240px_1fr] md:gap-12 lg:grid-cols-[280px_1fr]">
        <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-2xl bg-surface ring-1 ring-line md:w-full">
          <TmdbImage path={p.profile_path} alt={p.name} fill priority sizes="(min-width:768px) 280px, 176px" className="object-cover" fallback={<User className="size-10" />} />
        </div>
        <div className="animate-fade-up">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">{DEPT[p.known_for_department] ?? p.known_for_department}</p>
          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">{p.name}</h1>
          <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {p.birthday && (
              <div>
                <dt className="text-subtle">Nacimiento</dt>
                <dd>
                  {formatDate(p.birthday)}
                  {a !== null && !p.deathday && ` (${a} años)`}
                </dd>
              </div>
            )}
            {p.deathday && (
              <div>
                <dt className="text-subtle">Fallecimiento</dt>
                <dd>
                  {formatDate(p.deathday)}
                  {a !== null && ` (${a} años)`}
                </dd>
              </div>
            )}
            {p.place_of_birth && (
              <div>
                <dt className="text-subtle">Lugar</dt>
                <dd>{p.place_of_birth}</dd>
              </div>
            )}
            <div>
              <dt className="text-subtle">Créditos</dt>
              <dd>{p.cast.length + p.crew.length}</dd>
            </div>
          </dl>
          {p.biography && (
            <details className="group mb-6 max-w-3xl">
              <summary className="cursor-pointer list-none">
                <p className="line-clamp-5 whitespace-pre-line leading-relaxed text-white/75 group-open:line-clamp-none">{p.biography}</p>
                <span className="mt-2 inline-block text-sm font-medium text-accent group-open:hidden">Leer más</span>
              </summary>
            </details>
          )}
          {p.imdb_id && (
            <a href={`https://www.imdb.com/name/${p.imdb_id}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-[#f5c518] px-2 py-1 text-xs font-black text-black hover:brightness-110">
              IMDb <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>

      {p.knownFor.length > 0 && (
        <div className="mt-6">
          <Rail title="Conocido por">
            {p.knownFor.map((m) => (
              <MediaCard key={`${m.media_type}-${m.id}`} media={m} subtitle={m.character || m.job || year(m.date)} showType />
            ))}
          </Rail>
        </div>
      )}

      <div className="container-page mt-6 space-y-10">
        {filmography.map((g) => (
          <section key={g.key}>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              {g.label} <span className="text-subtle">· {g.items.length}</span>
            </h2>
            <Timeline items={g.items} />
          </section>
        ))}
      </div>
    </main>
  );
}

function Timeline({ items }: { items: PersonCredit[] }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
      {items.map((c) => (
        <li key={`${c.media_type}-${c.id}`}>
          <Link href={mediaHref(c)} className="flex items-center gap-4 px-4 py-2.5 transition hover:bg-surface-2">
            <span className="w-11 shrink-0 text-sm tabular-nums text-subtle">{year(c.date) || "—"}</span>
            <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-surface-3">
              <TmdbImage path={c.poster_path} alt="" fill sizes="92px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{c.title}</span>
              <span className="block truncate text-xs text-subtle">
                {c.media_type === "tv" ? "Serie" : "Película"}
                {(c.character || c.job) && ` · ${c.character || c.job}`}
                {c.episode_count ? ` · ${c.episode_count} ep.` : ""}
              </span>
            </span>
            {c.vote_count >= 20 && <Rating value={c.vote_average} votes={c.vote_count} />}
          </Link>
        </li>
      ))}
    </ol>
  );
}
