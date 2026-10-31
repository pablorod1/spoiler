import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { tmdb, TmdbError, REGION } from "./client";
import { age } from "@/lib/format";
import { pickLogo, pickTrailer, toSummaries, toSummary } from "./normalize";
import type {
  CastMember,
  CrewMember,
  Genre,
  ImageAsset,
  MediaDetails,
  MediaSummary,
  MediaType,
  Paged,
  PersonCredit,
  PersonDetails,
  PersonSummary,
  Provider,
  Season,
  Episode,
  Video,
  WatchAvailability,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const paged = (data: any, type?: MediaType): Paged<MediaSummary> => ({
  page: data.page,
  results: toSummaries(data.results, type),
  total_pages: Math.min(data.total_pages ?? 1, 500), // TMDB hard limit
  total_results: data.total_results ?? 0,
});

/* ------------------------------------------------------------------ lists */

export async function getTrending(
  type: "all" | MediaType = "all",
  window: "day" | "week" = "day",
): Promise<MediaSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("trending");
  const data = await tmdb<any>(`/trending/${type}/${window}`);
  return toSummaries(data.results, type === "all" ? undefined : type);
}

export type ListKind =
  | "popular"
  | "top_rated"
  | "upcoming"
  | "now_playing"
  | "on_the_air"
  | "airing_today";

export async function getList(type: MediaType, list: ListKind, page = 1) {
  "use cache";
  cacheLife("hours");
  const data = await tmdb<any>(`/${type}/${list}`, { page, region: REGION });
  return paged(data, type);
}

export interface HeroItem extends MediaSummary {
  logo: ImageAsset | null;
}

/** Trending titles enriched with their title logo for the cinematic hero. */
export async function getHeroItems(limit = 6): Promise<HeroItem[]> {
  "use cache";
  cacheLife("hours");
  const trending = await getTrending("all", "week");
  const picks = trending.filter((m) => m.backdrop_path && m.overview).slice(0, limit);
  return Promise.all(
    picks.map(async (m) => {
      const images = await tmdb<any>(`/${m.media_type}/${m.id}/images`, {
        include_image_language: "es,en,null",
      }).catch(() => null);
      return { ...m, logo: pickLogo(images?.logos) };
    }),
  );
}

/* --------------------------------------------------------------- discover */

export type SortKey = "popular" | "rating" | "newest" | "votes";

export interface DiscoverQuery {
  type: MediaType;
  providers?: number[];
  genres?: number[];
  sort?: SortKey;
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  maxRuntime?: number;
  monetization?: ("flatrate" | "free" | "ads" | "rent" | "buy")[];
  originalLanguage?: string;
  page?: number;
  /** Only titles already released (useful for "new on your platforms") */
  releasedOnly?: boolean;
}

export async function discover(q: DiscoverQuery): Promise<Paged<MediaSummary>> {
  "use cache";
  cacheLife("hours");

  const isMovie = q.type === "movie";
  const dateField = isMovie ? "primary_release_date" : "first_air_date";
  const sortMap: Record<SortKey, string> = {
    popular: "popularity.desc",
    rating: "vote_average.desc",
    newest: `${dateField}.desc`,
    votes: "vote_count.desc",
  };
  const sort = q.sort ?? "popular";
  const today = new Date().toISOString().slice(0, 10);

  const data = await tmdb<any>(`/discover/${q.type}`, {
    page: q.page ?? 1,
    sort_by: sortMap[sort],
    watch_region: REGION,
    region: isMovie ? REGION : undefined,
    with_watch_providers: q.providers?.length ? q.providers.join("|") : undefined,
    with_watch_monetization_types: q.monetization?.length
      ? q.monetization.join("|")
      : q.providers?.length
        ? "flatrate|free|ads"
        : undefined,
    with_genres: q.genres?.length ? q.genres.join(",") : undefined,
    [`${dateField}.gte`]: q.yearFrom ? `${q.yearFrom}-01-01` : undefined,
    [`${dateField}.lte`]: q.yearTo
      ? `${q.yearTo}-12-31`
      : q.releasedOnly || sort === "newest"
        ? today
        : undefined,
    "vote_average.gte": q.minRating,
    "vote_count.gte": sort === "rating" ? 300 : sort === "newest" ? 5 : 20,
    "with_runtime.lte": q.maxRuntime,
    with_original_language: q.originalLanguage,
    include_adult: false,
  });
  return paged(data, q.type);
}

/* ---------------------------------------------------------------- details */

function certificationFrom(raw: any, type: MediaType): string | null {
  if (type === "movie") {
    const es = raw.release_dates?.results?.find((r: any) => r.iso_3166_1 === REGION);
    const c = es?.release_dates?.find((d: any) => d.certification)?.certification;
    return c || null;
  }
  const es = raw.content_ratings?.results?.find((r: any) => r.iso_3166_1 === REGION);
  return es?.rating || null;
}

export async function getDetails(type: MediaType, id: number): Promise<MediaDetails | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`${type}-${id}`);

  const append = [
    type === "movie" ? "release_dates" : "content_ratings",
    type === "movie" ? "credits" : "aggregate_credits",
    "videos",
    "images",
    "watch/providers",
    "recommendations",
    "similar",
    "keywords",
    "external_ids",
  ].join(",");

  let raw: any;
  try {
    raw = await tmdb<any>(`/${type}/${id}`, {
      append_to_response: append,
      include_video_language: "es,en",
      include_image_language: "es,en,null",
    });
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) return null;
    throw e;
  }

  const credits = type === "movie" ? raw.credits : raw.aggregate_credits;
  const cast: CastMember[] = (credits?.cast ?? []).slice(0, 30).map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character ?? c.roles?.[0]?.character ?? "",
    profile_path: c.profile_path,
    order: c.order,
  }));
  const crew: CrewMember[] = (credits?.crew ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    job: c.job ?? c.jobs?.[0]?.job ?? "",
    department: c.department,
    profile_path: c.profile_path,
  }));
  const uniq = (list: CrewMember[]) => [...new Map(list.map((c) => [c.id, c])).values()];

  const videos: Video[] = raw.videos?.results ?? [];
  const recommendations = toSummaries(raw.recommendations?.results, type);
  const similar = toSummaries(raw.similar?.results, type);

  return {
    ...toSummary(raw, type),
    tagline: raw.tagline || null,
    genres: (raw.genres ?? []).map((g: Genre) => ({ ...g, name: GENRE_ES[g.id] ?? g.name })),
    runtime: raw.runtime ?? raw.episode_run_time?.[0] ?? raw.last_episode_to_air?.runtime ?? null,
    status: raw.status,
    certification: certificationFrom(raw, type),
    homepage: raw.homepage || null,
    imdb_id: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    budget: raw.budget,
    revenue: raw.revenue,
    number_of_seasons: raw.number_of_seasons,
    number_of_episodes: raw.number_of_episodes,
    seasons: (raw.seasons as Season[] | undefined)?.filter((s) => s.season_number > 0),
    next_episode_to_air: raw.next_episode_to_air ?? null,
    last_episode_to_air: raw.last_episode_to_air ?? null,
    networks: raw.networks,
    creators: raw.created_by ?? [],
    collection: raw.belongs_to_collection ?? null,
    directors: uniq(crew.filter((c) => c.job === "Director")),
    writers: uniq(crew.filter((c) => ["Screenplay", "Writer", "Novel", "Story"].includes(c.job))).slice(0, 4),
    cast,
    videos,
    trailer: pickTrailer(videos),
    logo: pickLogo(raw.images?.logos),
    availability: (raw["watch/providers"]?.results?.[REGION] as WatchAvailability) ?? null,
    recommendations: recommendations.length ? recommendations : similar,
    keywords: raw.keywords?.keywords ?? raw.keywords?.results ?? [],
  };
}

export async function getSeasonEpisodes(tvId: number, season: number): Promise<Episode[]> {
  "use cache";
  cacheLife("hours");
  const data = await tmdb<any>(`/tv/${tvId}/season/${season}`);
  return data.episodes ?? [];
}

export async function getCollection(id: number): Promise<{ name: string; parts: MediaSummary[] } | null> {
  "use cache";
  cacheLife("days");
  const data = await tmdb<any>(`/collection/${id}`).catch(() => null);
  if (!data) return null;
  const parts = toSummaries(data.parts, "movie").sort((a, b) =>
    (a.date ?? "9999").localeCompare(b.date ?? "9999"),
  );
  return { name: data.name, parts };
}

/* ----------------------------------------------------------------- people */

export async function getPerson(id: number): Promise<PersonDetails | null> {
  "use cache";
  cacheLife("days");
  let raw: any;
  try {
    raw = await tmdb<any>(`/person/${id}`, { append_to_response: "combined_credits,external_ids" });
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) return null;
    throw e;
  }

  // Spanish bios are often empty: fall back to English.
  let biography: string = raw.biography;
  if (!biography) {
    const en = await tmdb<any>(`/person/${id}`, { language: "en-US" }).catch(() => null);
    biography = en?.biography ?? "";
  }

  const mapCredit = (c: any): PersonCredit => ({
    ...toSummary(c),
    character: c.character,
    job: c.job ? (JOB_ES[c.job] ?? c.job) : undefined,
    episode_count: c.episode_count,
  });
  // Merge duplicates (same title, several jobs/episodes)
  const dedupe = (list: PersonCredit[]) => {
    const map = new Map<string, PersonCredit>();
    for (const c of list) {
      const key = `${c.media_type}-${c.id}`;
      const prev = map.get(key);
      if (!prev) map.set(key, c);
      else if (c.job && prev.job && !prev.job.includes(c.job)) prev.job += `, ${c.job}`;
    }
    return [...map.values()];
  };

  const isTalkOrSelf = (c: PersonCredit) =>
    /^(self|himself|herself|narrator \(voice\))$/i.test(c.character ?? "") || !c.poster_path;

  const cast = dedupe((raw.combined_credits?.cast ?? []).map(mapCredit));
  const crew = dedupe(
    (raw.combined_credits?.crew ?? []).filter((c: any) => !NOISE_JOBS.has(c.job)).map(mapCredit),
  );
  const pool = raw.known_for_department === "Acting" ? cast : crew;
  const knownFor = pool
    .filter((c) => !isTalkOrSelf(c) && c.vote_count > 50)
    .sort((a, b) => b.vote_count * (b.vote_average / 10) - a.vote_count * (a.vote_average / 10))
    .slice(0, 12);

  const byDateDesc = (a: PersonCredit, b: PersonCredit) =>
    (b.date ?? "9999").localeCompare(a.date ?? "9999");

  return {
    id: raw.id,
    name: raw.name,
    biography,
    birthday: raw.birthday,
    deathday: raw.deathday,
    place_of_birth: raw.place_of_birth,
    profile_path: raw.profile_path,
    known_for_department: raw.known_for_department,
    imdb_id: raw.external_ids?.imdb_id ?? raw.imdb_id ?? null,
    age: age(raw.birthday, raw.deathday),
    cast: cast.sort(byDateDesc),
    crew: crew.sort(byDateDesc),
    knownFor,
  };
}

const NOISE_JOBS = new Set(["Thanks", "Special Thanks", "In Memory Of", "Idea", "Archival Footage"]);
const JOB_ES: Record<string, string> = {
  Director: "Dirección",
  Screenplay: "Guion",
  Writer: "Guion",
  Teleplay: "Guion",
  Story: "Historia",
  Novel: "Novela",
  Characters: "Personajes",
  Producer: "Producción",
  "Executive Producer": "Producción ejecutiva",
  "Co-Producer": "Coproducción",
  Editor: "Montaje",
  "Director of Photography": "Fotografía",
  "Original Music Composer": "Música",
  Songs: "Canciones",
  Creator: "Creación",
};

/* ----------------------------------------------------------------- search */

export interface SearchResults {
  media: MediaSummary[];
  people: PersonSummary[];
  total_pages: number;
}

export async function search(query: string, page = 1): Promise<SearchResults> {
  "use cache";
  cacheLife("hours");
  const q = query.trim();
  if (!q) return { media: [], people: [], total_pages: 0 };
  const data = await tmdb<any>("/search/multi", { query: q, page, include_adult: false });
  const results: any[] = data.results ?? [];
  return {
    media: toSummaries(results).filter((m) => m.poster_path || m.backdrop_path),
    people: results
      .filter((r) => r.media_type === "person")
      .map((p) => ({
        id: p.id,
        media_type: "person" as const,
        name: p.name,
        profile_path: p.profile_path,
        known_for_department: p.known_for_department,
        known_for: toSummaries(p.known_for),
      })),
    total_pages: data.total_pages ?? 0,
  };
}

/* -------------------------------------------------------------- metadata */

/** Streaming services available in the region, movie + tv merged, by local priority. */
export async function getProviders(): Promise<Provider[]> {
  "use cache";
  cacheLife("days");
  const [movie, tv] = await Promise.all([
    tmdb<any>("/watch/providers/movie", { watch_region: REGION }),
    tmdb<any>("/watch/providers/tv", { watch_region: REGION }),
  ]);
  const map = new Map<number, Provider>();
  for (const p of [...movie.results, ...tv.results]) {
    const prio = p.display_priorities?.[REGION] ?? p.display_priority ?? 999;
    const prev = map.get(p.provider_id);
    if (!prev || prio < prev.display_priority) {
      map.set(p.provider_id, {
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
        display_priority: prio,
      });
    }
  }
  return [...map.values()]
    .filter((p) => !HIDDEN_PROVIDER.test(p.provider_name.trim()))
    .sort((a, b) => a.display_priority - b.display_priority);
}

/** Channels-inside-a-store, ad tiers and pure rental stores clutter a "which services do you have" picker. */
const HIDDEN_PROVIDER = /(amazon channel|apple tv channel|with ads|^justwatch|store$|^amazon video$)/i;

/** TMDB leaves several TV genres untranslated in es-ES. */
const GENRE_ES: Record<number, string> = {
  10759: "Acción y aventura",
  10762: "Infantil",
  10763: "Noticias",
  10765: "Ciencia ficción y fantasía",
  10766: "Telenovela",
  10767: "Entrevistas",
  10768: "Bélica y política",
};

export async function getGenres(type: MediaType): Promise<Genre[]> {
  "use cache";
  cacheLife("weeks");
  const data = await tmdb<any>(`/genre/${type}/list`);
  return (data.genres ?? []).map((g: Genre) => ({ ...g, name: GENRE_ES[g.id] ?? g.name }));
}

/** Upcoming theatrical releases in the region, soonest first. */
export async function getUpcomingMovies(): Promise<MediaSummary[]> {
  "use cache";
  cacheLife("hours");
  const today = new Date().toISOString().slice(0, 10);
  const pages = await Promise.all([1, 2].map((p) => tmdb<any>("/movie/upcoming", { page: p, region: REGION })));
  const seen = new Set<number>();
  return pages
    .flatMap((d) => toSummaries(d.results, "movie"))
    .filter((m) => m.date && m.date >= today && !seen.has(m.id) && seen.add(m.id))
    .sort((a, b) => a.date!.localeCompare(b.date!));
}

export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
