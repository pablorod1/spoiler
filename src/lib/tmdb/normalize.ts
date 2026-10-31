import type { MediaSummary, MediaType, Video, ImageAsset } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Movies and TV shows use different field names in TMDB; unify them. */
export function toSummary(raw: any, fallbackType?: MediaType): MediaSummary {
  const media_type: MediaType =
    raw.media_type === "movie" || raw.media_type === "tv"
      ? raw.media_type
      : (fallbackType ?? ("title" in raw ? "movie" : "tv"));
  return {
    id: raw.id,
    media_type,
    title: raw.title ?? raw.name ?? "",
    original_title: raw.original_title ?? raw.original_name ?? "",
    overview: raw.overview ?? "",
    poster_path: raw.poster_path ?? null,
    backdrop_path: raw.backdrop_path ?? null,
    vote_average: raw.vote_average ?? 0,
    vote_count: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
    date: (raw.release_date || raw.first_air_date) ?? null,
    genre_ids: raw.genre_ids ?? raw.genres?.map((g: any) => g.id) ?? [],
    original_language: raw.original_language ?? "",
  };
}

export function toSummaries(list: any[] | undefined, fallbackType?: MediaType) {
  return (list ?? [])
    .filter((r) => r.media_type !== "person")
    .map((r) => toSummary(r, fallbackType));
}

/** Best trailer: official Spanish trailer > Spanish trailer > official English > any YouTube video */
export function pickTrailer(videos: Video[]): Video | null {
  const yt = videos.filter((v) => v.site === "YouTube");
  const score = (v: Video) =>
    (v.type === "Trailer" ? 8 : v.type === "Teaser" ? 4 : 0) +
    (v.iso_639_1 === "es" ? 2 : 0) +
    (v.official ? 1 : 0);
  return yt.sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function pickLogo(logos: ImageAsset[] | undefined): ImageAsset | null {
  if (!logos?.length) return null;
  const rank = (l: ImageAsset) => (l.iso_639_1 === "es" ? 2 : l.iso_639_1 === "en" ? 1 : 0);
  return (
    [...logos].sort((a, b) => rank(b) - rank(a) || b.vote_average - a.vote_average)[0] ?? null
  );
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function mediaHref(m: { id: number; media_type: MediaType; title: string }) {
  const base = m.media_type === "movie" ? "/pelicula" : "/serie";
  const slug = slugify(m.title);
  return `${base}/${m.id}${slug ? `-${slug}` : ""}`;
}

export function personHref(p: { id: number; name: string }) {
  const slug = slugify(p.name);
  return `/persona/${p.id}${slug ? `-${slug}` : ""}`;
}

/** "603-the-matrix" -> 603 */
export function parseIdParam(param: string): number | null {
  const id = Number.parseInt(param, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}
