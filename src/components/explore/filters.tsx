"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpDown, Check, Clock, LoaderCircle, MonitorPlay, Star, Tags, CalendarRange, X } from "lucide-react";
import { Popover, OptionRow } from "@/components/ui/popover";
import { exploreToSearch, type ExploreState } from "@/lib/explore";
import type { SortKey } from "@/lib/tmdb/api";
import type { Genre, Provider } from "@/lib/tmdb/types";
import { cn } from "@/lib/cn";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Más populares" },
  { key: "newest", label: "Más recientes" },
  { key: "rating", label: "Mejor valoradas" },
  { key: "votes", label: "Más votadas" },
];
const RATINGS = [
  { value: 6, label: "★ 6 o más", hint: "Aceptables" },
  { value: 7, label: "★ 7 o más", hint: "Buenas" },
  { value: 8, label: "★ 8 o más", hint: "Imprescindibles" },
];
const RUNTIMES = [
  { value: 90, label: "Hasta 1 h 30 min", hint: "Una peli corta" },
  { value: 120, label: "Hasta 2 h", hint: "Lo normal" },
  { value: 150, label: "Hasta 2 h 30 min", hint: "Sin maratones de 3 h" },
];
const decadesFor = (y: number) => [
  { label: `Este año (${y})`, from: y, to: y },
  { label: "Últimos 5 años", from: y - 4, to: y },
  { label: "Años 2010", from: 2010, to: 2019 },
  { label: "Años 2000", from: 2000, to: 2009 },
  { label: "Años 90", from: 1990, to: 1999 },
  { label: "Años 80", from: 1980, to: 1989 },
  { label: "Clásicos (antes de 1980)", from: 1900, to: 1979 },
];

const EMPTY: Partial<ExploreState> = {
  mine: false, providers: [], genres: [], sort: "popular", yearFrom: undefined, yearTo: undefined, minRating: undefined, maxRuntime: undefined,
};

/** Filter bar + results. Results are server-rendered children, dimmed while a new query loads. */
export function ExploreShell({
  basePath,
  state,
  providers,
  genres,
  myProviderIds,
  currentYear,
  total,
  noun,
  children,
}: {
  basePath: string;
  state: ExploreState;
  providers: Provider[];
  genres: Genre[];
  myProviderIds: number[];
  currentYear: number;
  total: number;
  noun: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const decades = decadesFor(currentYear);

  const update = (patch: Partial<ExploreState>) => {
    const qs = exploreToSearch({ ...state, ...patch }).toString();
    start(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  };
  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const byId = new Map(providers.map((p) => [p.provider_id, p]));
  const genreName = new Map(genres.map((g) => [g.id, g.name]));
  const decade = decades.find((d) => d.from === state.yearFrom && d.to === state.yearTo);
  const sortLabel = SORTS.find((s) => s.key === state.sort)?.label ?? "Más populares";
  const anyProvider = state.mine || state.providers.length > 0;

  // Active filter chips
  const chips: { key: string; label: React.ReactNode; remove: () => void }[] = [
    ...(state.mine ? [{ key: "mine", label: "Mis plataformas", remove: () => update({ mine: false }) }] : []),
    ...state.providers.map((id) => ({
      key: `p${id}`,
      label: byId.get(id)?.provider_name ?? "Plataforma",
      remove: () => update({ providers: state.providers.filter((x) => x !== id) }),
    })),
    ...state.genres.map((id) => ({
      key: `g${id}`,
      label: genreName.get(id) ?? "Género",
      remove: () => update({ genres: state.genres.filter((x) => x !== id) }),
    })),
    ...(state.yearFrom ? [{ key: "y", label: decade?.label ?? `${state.yearFrom}–${state.yearTo ?? ""}`, remove: () => update({ yearFrom: undefined, yearTo: undefined }) }] : []),
    ...(state.minRating ? [{ key: "r", label: `★ ${state.minRating}+`, remove: () => update({ minRating: undefined }) }] : []),
    ...(state.maxRuntime ? [{ key: "d", label: `≤ ${state.maxRuntime} min`, remove: () => update({ maxRuntime: undefined }) }] : []),
  ];

  const genreSummary = state.genres.length
    ? `${genreName.get(state.genres[0]) ?? "Género"}${state.genres.length > 1 ? ` +${state.genres.length - 1}` : ""}`
    : null;

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-line bg-bg/[0.97] px-4 pb-3 pt-2 md:-mx-8 md:px-8 xl:-mx-12 xl:px-12">
        {/* Platforms. Padding on the scroller keeps selection/focus rings from being clipped. */}
        <div className="relative">
          <div className="no-scrollbar -mx-2 flex items-center gap-2 overflow-x-auto p-2" role="group" aria-label="Plataformas">
            <div className="flex shrink-0 rounded-full border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => update({ mine: false, providers: [] })}
                aria-pressed={!anyProvider}
                className={cn(
                  "h-8 rounded-full px-3.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  !anyProvider ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
                )}
              >
                Todas
              </button>
              {myProviderIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => update({ mine: !state.mine, providers: [] })}
                  aria-pressed={state.mine}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    state.mine ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <MonitorPlay className="size-4" /> Las mías
                </button>
              ) : (
                <Link href="/mis-plataformas" className="inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted hover:text-fg">
                  <MonitorPlay className="size-4" /> Elegir las mías
                </Link>
              )}
            </div>
            <span className="h-6 w-px shrink-0 bg-line" aria-hidden />
            {providers.map((p) => {
              const on = state.mine ? myProviderIds.includes(p.provider_id) : state.providers.includes(p.provider_id);
              return (
                <button
                  key={p.provider_id}
                  type="button"
                  title={p.provider_name}
                  aria-label={p.provider_name}
                  aria-pressed={on}
                  onClick={() => update({ mine: false, providers: toggle(state.mine ? [] : state.providers, p.provider_id) })}
                  className={cn(
                    "relative size-10 shrink-0 rounded-xl transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-95",
                    on && "ring-2 ring-white ring-offset-2 ring-offset-bg",
                    anyProvider && !on && "opacity-40 grayscale hover:opacity-100 hover:grayscale-0",
                  )}
                >
                  <Image src={p.logo_path} alt="" fill sizes="40px" className="rounded-xl object-cover" />
                  {on && (
                    <span className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-white text-black shadow">
                      <Check className="size-2.5" strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg/90 to-transparent" aria-hidden />
        </div>

        {/* Facets */}
        <div className="no-scrollbar -mx-2 flex items-center gap-2 overflow-x-auto px-2 pb-1 pt-1 md:overflow-visible">
          <Popover label="Géneros" summary={genreSummary} active={state.genres.length > 0} icon={<Tags className="size-4" />} width="md:w-[26rem]">
            {() => (
              <div className="grid grid-cols-2 gap-0.5">
                {genres.map((g) => (
                  <OptionRow key={g.id} multi selected={state.genres.includes(g.id)} onClick={() => update({ genres: toggle(state.genres, g.id) })}>
                    {g.name}
                  </OptionRow>
                ))}
              </div>
            )}
          </Popover>
          <Popover label="Época" summary={decade?.label ?? null} active={Boolean(state.yearFrom)} icon={<CalendarRange className="size-4" />}>
            {(close) => (
              <>
                {decades.map((d) => (
                  <OptionRow
                    key={d.label}
                    selected={decade === d}
                    onClick={() => {
                      update(decade === d ? { yearFrom: undefined, yearTo: undefined } : { yearFrom: d.from, yearTo: d.to });
                      close();
                    }}
                  >
                    {d.label}
                  </OptionRow>
                ))}
              </>
            )}
          </Popover>
          <Popover label="Nota" summary={state.minRating ? `${state.minRating} o más` : null} active={Boolean(state.minRating)} icon={<Star className="size-4" />}>
            {(close) => (
              <>
                {RATINGS.map((r) => (
                  <OptionRow
                    key={r.value}
                    selected={state.minRating === r.value}
                    onClick={() => {
                      update({ minRating: state.minRating === r.value ? undefined : r.value });
                      close();
                    }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      {r.label} <span className="text-xs text-subtle">{r.hint}</span>
                    </span>
                  </OptionRow>
                ))}
              </>
            )}
          </Popover>
          <Popover label="Duración" summary={state.maxRuntime ? `≤ ${state.maxRuntime} min` : null} active={Boolean(state.maxRuntime)} icon={<Clock className="size-4" />}>
            {(close) => (
              <>
                {RUNTIMES.map((r) => (
                  <OptionRow
                    key={r.value}
                    selected={state.maxRuntime === r.value}
                    onClick={() => {
                      update({ maxRuntime: state.maxRuntime === r.value ? undefined : r.value });
                      close();
                    }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      {r.label} <span className="text-xs text-subtle">{r.hint}</span>
                    </span>
                  </OptionRow>
                ))}
              </>
            )}
          </Popover>
          <div className="ml-auto">
            <Popover label="Ordenar" summary={sortLabel} align="right" icon={<ArrowUpDown className="size-4" />} width="md:w-60">
              {(close) => (
                <>
                  {SORTS.map((s) => (
                    <OptionRow
                      key={s.key}
                      selected={state.sort === s.key}
                      onClick={() => {
                        update({ sort: s.key });
                        close();
                      }}
                    >
                      {s.label}
                    </OptionRow>
                  ))}
                </>
              )}
            </Popover>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="no-scrollbar -mx-2 flex items-center gap-1.5 overflow-x-auto px-2 pt-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.remove}
                className="group inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-accent/15 pl-3 pr-2 text-xs font-medium text-accent transition outline-none hover:bg-accent/25 focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Quitar filtro ${typeof c.label === "string" ? c.label : ""}`}
              >
                {c.label}
                <X className="size-3.5 opacity-70 group-hover:opacity-100" />
              </button>
            ))}
            <button type="button" onClick={() => update(EMPTY)} className="ml-1 h-7 shrink-0 px-2 text-xs font-medium text-subtle hover:text-fg">
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      <p className="mb-4 flex items-center gap-2 text-sm text-subtle" aria-live="polite">
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" /> Actualizando…
          </>
        ) : (
          <>
            <span className="font-semibold text-fg">{total.toLocaleString("es-ES")}</span> {noun}
          </>
        )}
      </p>
      <div className={cn("transition duration-300", pending && "pointer-events-none opacity-40 blur-[1px]")}>{children}</div>
    </>
  );
}
