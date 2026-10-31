import type { DiscoverQuery, SortKey } from "@/lib/tmdb/api";
import type { MediaType } from "@/lib/tmdb/types";

/** URL (Spanish, shareable) <-> discover query */
export interface ExploreState {
  providers: number[];
  genres: number[];
  sort: SortKey;
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  maxRuntime?: number;
  mine: boolean;
}

type SP = Record<string, string | string[] | undefined> | URLSearchParams;

const get = (sp: SP, k: string) => {
  const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? undefined;
};
const ints = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((x) => Number.parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 20);
const int = (v: string | undefined, min: number, max: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

const SORTS: Record<string, SortKey> = { popular: "popular", nota: "rating", recientes: "newest", votos: "votes" };
export const SORT_PARAM: Record<SortKey, string> = { popular: "popular", rating: "nota", newest: "recientes", votes: "votos" };

export function parseExplore(sp: SP): ExploreState {
  return {
    providers: ints(get(sp, "plataformas")),
    genres: ints(get(sp, "generos")),
    sort: SORTS[get(sp, "orden") ?? ""] ?? "popular",
    yearFrom: int(get(sp, "desde"), 1900, 2100),
    yearTo: int(get(sp, "hasta"), 1900, 2100),
    minRating: int(get(sp, "nota"), 1, 9),
    maxRuntime: int(get(sp, "duracion"), 30, 400),
    mine: get(sp, "mias") === "1",
  };
}

export function exploreToSearch(s: ExploreState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.mine) p.set("mias", "1");
  else if (s.providers.length) p.set("plataformas", s.providers.join(","));
  if (s.genres.length) p.set("generos", s.genres.join(","));
  if (s.sort !== "popular") p.set("orden", SORT_PARAM[s.sort]);
  if (s.yearFrom) p.set("desde", String(s.yearFrom));
  if (s.yearTo) p.set("hasta", String(s.yearTo));
  if (s.minRating) p.set("nota", String(s.minRating));
  if (s.maxRuntime) p.set("duracion", String(s.maxRuntime));
  return p;
}

export function toDiscover(type: MediaType, s: ExploreState, myProviders: number[], page = 1): DiscoverQuery {
  return {
    type,
    providers: s.mine ? myProviders : s.providers,
    genres: s.genres,
    sort: s.sort,
    yearFrom: s.yearFrom,
    yearTo: s.yearTo,
    minRating: s.minRating,
    maxRuntime: s.maxRuntime,
    page,
  };
}
