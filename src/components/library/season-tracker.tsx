"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ChevronDown, CheckCheck, Layers, LoaderCircle, Play } from "lucide-react";
import { setEpisodesWatched } from "@/lib/library/actions";
import { nextEpisode } from "@/lib/library/progress";
import { formatShortDate, formatRuntime, year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MediaSnapshot } from "@/lib/library/types";

export interface TrackerSeason {
  season_number: number;
  name: string;
  episode_count: number;
  aired: number;
  air_date: string | null;
  poster_path: string | null;
}

interface EpisodeInfo {
  episode_number: number;
  name: string;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
}

const key = (s: number, e: number) => `${s}-${e}`;

export function SeasonTracker({
  media,
  seasons,
  initialWatched,
  loginHref,
}: {
  media: MediaSnapshot;
  seasons: TrackerSeason[];
  initialWatched: string[];
  loginHref?: string;
}) {
  const router = useRouter();
  const [watched, setWatched] = useState(() => new Set(initialWatched));
  const [open, setOpen] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, EpisodeInfo[] | "loading">>({});
  const [, start] = useTransition();

  const airedTotal = seasons.reduce((n, s) => n + s.aired, 0);
  const watchedCount = [...watched].filter((k) => !k.startsWith("0-")).length;

  const next = useMemo(
    () => nextEpisode(seasons.map((s) => ({ season: s.season_number, aired: s.aired })), watched),
    [seasons, watched],
  );

  const mutate = (list: { season: number; episode: number }[], value: boolean) => {
    if (loginHref) return router.push(loginHref);
    const prev = watched;
    const nextSet = new Set(watched);
    for (const ep of list) {
      if (value) nextSet.add(key(ep.season, ep.episode));
      else nextSet.delete(key(ep.season, ep.episode));
    }
    setWatched(nextSet);
    start(async () => {
      const res = await setEpisodesWatched(media, list, value, airedTotal);
      if (!res.ok) setWatched(prev);
      else router.refresh();
    });
  };

  const range = (season: number, from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => ({ season, episode: from + i }));

  const toggleSeason = async (n: number) => {
    setOpen((o) => (o === n ? null : n));
    if (episodes[n]) return;
    setEpisodes((e) => ({ ...e, [n]: "loading" }));
    try {
      const res = await fetch(`/api/tv/${media.tmdbId}/season/${n}`);
      const data: EpisodeInfo[] = await res.json();
      setEpisodes((e) => ({ ...e, [n]: data }));
    } catch {
      setEpisodes((e) => {
        const copy = { ...e };
        delete copy[n];
        return copy;
      });
    }
  };

  const ordered = [...seasons].sort((a, b) => (a.season_number === 0 ? 1 : b.season_number === 0 ? -1 : a.season_number - b.season_number));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Layers className="size-5 text-accent" /> Temporadas y episodios
        </h2>
        {airedTotal > 0 && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-fg">{watchedCount}</span> de {airedTotal} episodios vistos
          </p>
        )}
      </div>

      {airedTotal > 0 && (
        <div className="mb-4 rounded-2xl border border-line bg-surface/60 p-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-good transition-all duration-500" style={{ width: `${Math.min(100, (watchedCount / airedTotal) * 100)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {next ? (
                <>
                  <span className="text-subtle">{watchedCount ? "Tu siguiente episodio:" : "Empieza por:"} </span>
                  <span className="font-semibold">
                    T{next.season} · E{next.episode}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-good">¡Estás al día! 🎉</span>
              )}
            </p>
            {next && (
              <button
                type="button"
                onClick={() => mutate([next], true)}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-good px-4 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
              >
                <Check className="size-4" strokeWidth={3} /> Marcar T{next.season}E{next.episode} como visto
              </button>
            )}
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {ordered.map((s) => {
          const seen = range(s.season_number, 1, s.aired).filter((e) => watched.has(key(e.season, e.episode))).length;
          const complete = s.aired > 0 && seen >= s.aired;
          const isOpen = open === s.season_number;
          const eps = episodes[s.season_number];
          return (
            <li key={s.season_number} className="overflow-hidden rounded-2xl border border-line bg-surface/50">
              <div className="flex items-center gap-3 p-3">
                <button type="button" onClick={() => toggleSeason(s.season_number)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    {s.poster_path && <Image src={s.poster_path} alt="" fill sizes="92px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-xs text-subtle">
                      {[year(s.air_date), `${s.episode_count} episodios`, s.aired < s.episode_count && s.aired > 0 ? `${s.aired} emitidos` : null, s.aired === 0 ? "Próximamente" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {s.aired > 0 && (
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
                          <span className="block h-full rounded-full bg-good" style={{ width: `${(seen / s.aired) * 100}%` }} />
                        </span>
                        <span className="text-[11px] tabular-nums text-subtle">
                          {seen}/{s.aired}
                        </span>
                      </span>
                    )}
                  </span>
                  <ChevronDown className={cn("size-5 shrink-0 text-subtle transition", isOpen && "rotate-180")} />
                </button>
                {s.aired > 0 && (
                  <button
                    type="button"
                    onClick={() => mutate(range(s.season_number, 1, s.aired), !complete)}
                    title={complete ? "Desmarcar temporada" : "Marcar temporada como vista"}
                    aria-label={complete ? "Desmarcar temporada" : "Marcar temporada como vista"}
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full border transition active:scale-95",
                      complete ? "border-good bg-good text-black" : "border-line-strong text-muted hover:border-good hover:text-good",
                    )}
                  >
                    <CheckCheck className="size-4" />
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-line">
                  {eps === "loading" || !eps ? (
                    <div className="flex justify-center py-6">
                      <LoaderCircle className="size-5 animate-spin text-subtle" />
                    </div>
                  ) : (
                    <ol className="divide-y divide-line">
                      {eps.map((ep) => {
                        const aired = ep.episode_number <= s.aired;
                        const on = watched.has(key(s.season_number, ep.episode_number));
                        const isNext = next?.season === s.season_number && next.episode === ep.episode_number;
                        return (
                          <li key={ep.episode_number} className={cn("group flex items-center gap-3 px-3 py-2.5", isNext && "bg-accent/5")}>
                            <span className="relative hidden aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-surface-3 sm:block">
                              {ep.still_path && <Image src={ep.still_path} alt="" fill sizes="154px" className={cn("object-cover", on && "opacity-50")} />}
                              {isNext && (
                                <span className="absolute inset-0 grid place-items-center bg-black/40">
                                  <Play className="size-5 fill-white text-white" />
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn("block truncate text-sm font-medium", on && "text-muted")}>
                                <span className="tabular-nums text-subtle">{ep.episode_number}.</span> {ep.name}
                              </span>
                              <span className="block text-xs text-subtle">
                                {[ep.air_date ? formatShortDate(ep.air_date) + " " + year(ep.air_date) : "Sin fecha", formatRuntime(ep.runtime)].filter(Boolean).join(" · ")}
                                {isNext && <span className="ml-2 font-medium text-accent">Siguiente</span>}
                              </span>
                            </span>
                            {aired && !on && ep.episode_number > 1 && (
                              <button
                                type="button"
                                onClick={() => mutate(range(s.season_number, 1, ep.episode_number), true)}
                                className="hidden h-8 shrink-0 rounded-full px-3 text-xs text-subtle transition hover:bg-surface-3 hover:text-fg group-hover:inline-flex group-hover:items-center"
                              >
                                Visto hasta aquí
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!aired}
                              onClick={() => mutate([{ season: s.season_number, episode: ep.episode_number }], !on)}
                              aria-pressed={on}
                              aria-label={on ? "Marcar como no visto" : "Marcar como visto"}
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-full border transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-30",
                                on ? "border-good bg-good text-black" : "border-line-strong text-transparent hover:border-good hover:text-good",
                              )}
                            >
                              <Check className="size-4" strokeWidth={3} />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
