import "server-only";
import { cacheLife } from "next/cache";
import { tmdb, REGION } from "./client";
import { getGenres } from "./api";
import { pickLogo, toSummary } from "./normalize";
import type { ImageAsset, MediaSummary, MediaType } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface RankedItem extends MediaSummary {
  rank: number;
  logo: ImageAsset | null;
  genres: string[];
  weeksInTop?: number;
}

export interface PlatformTop {
  /** "official" = the platform's own published ranking; "trending" = our popularity-based estimate */
  source: "official" | "trending";
  /** ISO date of the ranking week (official only) */
  week?: string;
  tv: RankedItem[];
  movie: RankedItem[];
}

const NETFLIX = 8;
const NETFLIX_PAGES = {
  Films: "https://www.netflix.com/tudum/top10/spain",
  TV: "https://www.netflix.com/tudum/top10/spain/tv",
} as const;

/* ------------------------------------------------ Netflix official Top 10 */

interface NetflixRow {
  week: string | undefined;
  category: "Films" | "TV";
  rank: number;
  title: string;
  weeks: number;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/**
 * Reads Netflix's official weekly Top 10 for Spain from its public Top 10 site
 * (~2 MB per list). Their downloadable TSV covers every country (~32 MB, no range
 * requests) and lags a week behind, so the page is both lighter and fresher.
 */
async function fetchNetflixSpain(): Promise<NetflixRow[]> {
  const lists = await Promise.all(
    (Object.entries(NETFLIX_PAGES) as [NetflixRow["category"], string][]).map(async ([category, url]) => {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Whatcher; +https://whatcher.vercel.app)", "accept-language": "es-ES" } });
      if (!res.ok) return [];
      const html = await res.text();
      const week = html.match(/"weekEndDate":"(\d{4}-\d{2}-\d{2})"/)?.[1];
      const re = /top10-table-row-title"><span class="rank">(\d+)<\/span>[\s\S]*?<button>([\s\S]*?)<\/button><\/td><td data-uia="top10-table-row-weeks">(\d+)/g;
      return [...html.matchAll(re)].map((m) => ({ week, category, rank: Number(m[1]), title: decodeEntities(m[2]).trim(), weeks: Number(m[3]) }));
    }),
  );
  return lists.flat();
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** "Lupin: Part 4" -> "Lupin", "Below: Limited Series" -> "Below" */
const stripSeason = (t: string) =>
  t.replace(/:\s*(season|temporada|part|parte|limited series|miniserie|volume|vol\.|book|chapter|collection|series)\b.*$/i, "").trim();

/**
 * Netflix lists titles by their English name. Search TMDB in English so names are
 * comparable, accept only exact/close matches, then load the Spanish data for that id.
 */
async function matchTitle(rawTitle: string, type: MediaType): Promise<MediaSummary | null> {
  const title = type === "tv" ? stripSeason(rawTitle) : rawTitle;
  const data = await tmdb<any>(`/search/${type}`, { query: title, include_adult: false, language: "en-US" }).catch(() => null);
  const results: any[] = data?.results ?? [];
  if (!results.length) return null;
  const n = norm(title);
  const names = (r: any) => [r.title, r.name, r.original_title, r.original_name].filter(Boolean).map((t: string) => norm(t));
  const isExact = (r: any) => names(r).includes(n);
  const isClose = (r: any) => n.length >= 6 && names(r).some((t: string) => t.startsWith(n) || n.startsWith(t));
  // Brand-new seasons sometimes get their own empty TMDB entry ("Cyberpunk: Edgerunners 2",
  // no images): prefer a match with artwork, which falls back to the parent series.
  const candidates = [...results.filter(isExact), ...results.filter((r) => !isExact(r) && isClose(r))];
  const hit = candidates.find((r) => r.backdrop_path) ?? candidates[0];
  if (!hit) return null;
  const es = await tmdb<any>(`/${type}/${hit.id}`).catch(() => null);
  return es ? toSummary(es, type) : null;
}

async function enrich(items: MediaSummary[], extra: Map<number, Partial<RankedItem>> = new Map()): Promise<RankedItem[]> {
  const [mg, tg] = await Promise.all([getGenres("movie"), getGenres("tv")]);
  const names = new Map([...mg, ...tg].map((g) => [g.id, g.name]));
  return Promise.all(
    items.map(async (m, i) => {
      const images = await tmdb<any>(`/${m.media_type}/${m.id}/images`, { include_image_language: "es,en,null" }).catch(() => null);
      return {
        ...m,
        rank: i + 1,
        logo: pickLogo(images?.logos),
        genres: m.genre_ids.map((g) => names.get(g)).filter((g): g is string => !!g).slice(0, 3),
        ...extra.get(i),
      };
    }),
  );
}

async function netflixOfficial(): Promise<PlatformTop | null> {
  const rows = await fetchNetflixSpain().catch(() => []);
  if (!rows.length) return null;
  const build = async (category: NetflixRow["category"], type: MediaType) => {
    const list = rows.filter((r) => r.category === category).sort((a, b) => a.rank - b.rank);
    const matched = await Promise.all(list.map((r) => matchTitle(r.title, type)));
    const items: MediaSummary[] = [];
    const extra = new Map<number, Partial<RankedItem>>();
    matched.forEach((m, i) => {
      if (!m || !m.backdrop_path) return;
      extra.set(items.length, { weeksInTop: list[i].weeks, rank: list[i].rank });
      items.push(m);
    });
    return enrich(items, extra);
  };
  const [tv, movie] = await Promise.all([build("TV", "tv"), build("Films", "movie")]);
  return { source: "official", week: rows.find((r) => r.week)?.week, tv, movie };
}

/* ------------------------------------------- trending estimate (others) */

/** Run async work with bounded concurrency (TMDB rate limits). */
async function pMap<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** This week's trending titles in TMDB, in order. */
async function getTrendingPool(type: MediaType): Promise<MediaSummary[]> {
  "use cache";
  cacheLife("hours");
  const pages = await Promise.all([1, 2, 3, 4, 5].map((page) => tmdb<any>(`/trending/${type}/week`, { page }).catch(() => ({ results: [] }))));
  const seen = new Set<number>();
  return pages
    .flatMap((p) => p.results ?? [])
    .filter((r: any) => !seen.has(r.id) && seen.add(r.id))
    .map((r: any) => toSummary(r, type));
}

/** Subscription-style providers (flatrate/free/ads) for a title in the region. */
async function getStreamingProviders(type: MediaType, id: number): Promise<number[]> {
  "use cache";
  cacheLife("days");
  const data = await tmdb<any>(`/${type}/${id}/watch/providers`).catch(() => null);
  const es = data?.results?.[REGION];
  if (!es) return [];
  return [...(es.flatrate ?? []), ...(es.free ?? []), ...(es.ads ?? [])].map((p: any) => p.provider_id);
}

const NOISE_GENRES = "10763,10767,10766,10762"; // news, talk, soap, kids

async function trendingFor(type: MediaType, providerId: number): Promise<MediaSummary[]> {
  const pool = (await getTrendingPool(type)).filter((m) => m.backdrop_path && m.poster_path);
  const providers = await pMap(pool, 12, (m) => getStreamingProviders(type, m.id));
  const picked = pool.filter((_, i) => providers[i].includes(providerId)).slice(0, 10);
  if (picked.length >= 10) return picked;

  // Top up with recent popular titles on the platform
  const iso = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const fill = await tmdb<any>(`/discover/${type}`, {
    watch_region: REGION,
    with_watch_providers: providerId,
    with_watch_monetization_types: "flatrate|free|ads",
    sort_by: "popularity.desc",
    without_genres: NOISE_GENRES,
    "vote_count.gte": 10,
    ...(type === "movie" ? { "primary_release_date.gte": iso(730) } : { "first_air_date.gte": iso(1095) }),
  }).catch(() => ({ results: [] }));
  const have = new Set(picked.map((m) => m.id));
  const extra = (fill.results ?? [])
    .map((r: any) => toSummary(r, type))
    .filter((m: MediaSummary) => !have.has(m.id) && m.backdrop_path && m.poster_path);
  return [...picked, ...extra].slice(0, 10);
}

async function trendingEstimate(providerId: number): Promise<PlatformTop> {
  const [tvList, movieList] = await Promise.all([trendingFor("tv", providerId), trendingFor("movie", providerId)]);
  const [tv, movie] = await Promise.all([enrich(tvList), enrich(movieList)]);
  return { source: "trending", tv, movie };
}

/** Top 10 for a platform: Netflix's official Spanish ranking, or a recent-popularity estimate. */
export async function getPlatformTop(providerId: number): Promise<PlatformTop> {
  "use cache";
  if (providerId === NETFLIX) cacheLife("days");
  else cacheLife("hours");
  if (providerId === NETFLIX) {
    const official = await netflixOfficial();
    if (official && official.tv.length + official.movie.length >= 10) return official;
  }
  return trendingEstimate(providerId);
}
