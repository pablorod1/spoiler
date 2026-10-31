"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SlidersHorizontal, Check, X, MonitorPlay } from "lucide-react";
import { exploreToSearch, type ExploreState } from "@/lib/explore";
import type { SortKey } from "@/lib/tmdb/api";
import type { Genre, Provider } from "@/lib/tmdb/types";
import { cn } from "@/lib/cn";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Populares" },
  { key: "newest", label: "Recientes" },
  { key: "rating", label: "Mejor valoradas" },
  { key: "votes", label: "Más votadas" },
];
const RATINGS = [6, 7, 8];
const RUNTIMES = [90, 120, 150];
const decadesFor = (CURRENT_YEAR: number) => [
  { label: `${CURRENT_YEAR}`, from: CURRENT_YEAR, to: CURRENT_YEAR },
  { label: "Últimos 5 años", from: CURRENT_YEAR - 4, to: CURRENT_YEAR },
  { label: "2010s", from: 2010, to: 2019 },
  { label: "2000s", from: 2000, to: 2009 },
  { label: "90s", from: 1990, to: 1999 },
  { label: "80s", from: 1980, to: 1989 },
  { label: "Clásicos", from: 1900, to: 1979 },
];

const chip =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition active:scale-[0.97]";
const chipOn = "border-white bg-white text-black";
const chipOff = "border-line bg-surface text-muted hover:border-line-strong hover:text-fg";

export function ExploreFilters({
  basePath,
  state,
  providers,
  genres,
  myProviderIds,
  currentYear,
}: {
  basePath: string;
  state: ExploreState;
  providers: Provider[];
  genres: Genre[];
  myProviderIds: number[];
  currentYear: number;
}) {
  const DECADES = decadesFor(currentYear);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [more, setMore] = useState(Boolean(state.yearFrom || state.minRating || state.maxRuntime));

  const update = (patch: Partial<ExploreState>) => {
    const next = { ...state, ...patch };
    const qs = exploreToSearch(next).toString();
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  };

  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const activeExtras = [state.yearFrom, state.minRating, state.maxRuntime].filter(Boolean).length;
  const hasAny = state.mine || state.providers.length || state.genres.length || activeExtras || state.sort !== "popular";
  const decade = DECADES.find((d) => d.from === state.yearFrom && d.to === state.yearTo);

  return (
    <div className="relative space-y-3">
      {pending && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent/20">
          <div className="h-full w-1/3 bg-accent" style={{ animation: "loading-bar 1s linear infinite" }} />
          <style>{`@keyframes loading-bar{from{transform:translateX(-100%)}to{transform:translateX(300%)}}`}</style>
        </div>
      )}

      {/* Platforms */}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <button
          type="button"
          className={cn(chip, !state.mine && !state.providers.length ? chipOn : chipOff)}
          onClick={() => update({ mine: false, providers: [] })}
        >
          Todo
        </button>
        {myProviderIds.length > 0 ? (
          <button
            type="button"
            className={cn(chip, state.mine ? "border-accent bg-accent text-accent-fg" : chipOff)}
            onClick={() => update({ mine: !state.mine, providers: [] })}
          >
            <MonitorPlay className="size-4" />
            Mis plataformas
          </button>
        ) : (
          <Link href="/mis-plataformas" className={cn(chip, chipOff, "border-dashed")}>
            <MonitorPlay className="size-4" />
            Elegir mis plataformas
          </Link>
        )}
        <span className="mx-1 h-6 w-px shrink-0 bg-line" />
        {providers.map((p) => {
          const on = !state.mine && state.providers.includes(p.provider_id);
          return (
            <button
              key={p.provider_id}
              type="button"
              title={p.provider_name}
              aria-pressed={on}
              onClick={() => update({ mine: false, providers: toggle(state.mine ? [] : state.providers, p.provider_id) })}
              className={cn(
                "relative size-9 shrink-0 overflow-hidden rounded-xl ring-1 transition active:scale-95",
                on ? "ring-2 ring-white" : "opacity-60 ring-line grayscale-[40%] hover:opacity-100 hover:grayscale-0",
              )}
            >
              <Image src={p.logo_path} alt={p.provider_name} fill sizes="36px" />
              {on && (
                <span className="absolute inset-0 grid place-items-center bg-black/40">
                  <Check className="size-4 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Genres */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {genres.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={state.genres.includes(g.id)}
            className={cn(chip, "h-8 text-[13px]", state.genres.includes(g.id) ? chipOn : chipOff)}
            onClick={() => update({ genres: toggle(state.genres, g.id) })}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Sort + more */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="no-scrollbar flex overflow-x-auto rounded-full border border-line bg-surface p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => update({ sort: s.key })}
              className={cn(
                "h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition",
                state.sort === s.key ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMore((v) => !v)} className={cn(chip, more ? "border-line-strong bg-surface-2 text-fg" : chipOff)}>
          <SlidersHorizontal className="size-4" />
          Más filtros
          {activeExtras > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">{activeExtras}</span>
          )}
        </button>
        {hasAny ? (
          <button
            type="button"
            onClick={() => update({ mine: false, providers: [], genres: [], sort: "popular", yearFrom: undefined, yearTo: undefined, minRating: undefined, maxRuntime: undefined })}
            className="inline-flex h-9 items-center gap-1 px-2 text-sm text-subtle hover:text-fg"
          >
            <X className="size-4" /> Limpiar
          </button>
        ) : null}
      </div>

      {more && (
        <div className="grid gap-5 rounded-2xl border border-line bg-surface/60 p-4 md:grid-cols-3 md:p-5">
          <FilterGroup label="Época">
            {DECADES.map((d) => (
              <button
                key={d.label}
                type="button"
                className={cn(chip, "h-8 text-[13px]", decade === d ? chipOn : chipOff)}
                onClick={() => update(decade === d ? { yearFrom: undefined, yearTo: undefined } : { yearFrom: d.from, yearTo: d.to })}
              >
                {d.label}
              </button>
            ))}
          </FilterGroup>
          <FilterGroup label="Nota mínima">
            {RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                className={cn(chip, "h-8 text-[13px]", state.minRating === r ? chipOn : chipOff)}
                onClick={() => update({ minRating: state.minRating === r ? undefined : r })}
              >
                ★ {r}+
              </button>
            ))}
          </FilterGroup>
          <FilterGroup label="Duración máxima">
            {RUNTIMES.map((r) => (
              <button
                key={r}
                type="button"
                className={cn(chip, "h-8 text-[13px]", state.maxRuntime === r ? chipOn : chipOff)}
                onClick={() => update({ maxRuntime: state.maxRuntime === r ? undefined : r })}
              >
                ≤ {r} min
              </button>
            ))}
          </FilterGroup>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
