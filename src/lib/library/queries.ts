import "server-only";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { episodeWatch, libraryItem, userProvider } from "@/lib/db/schema";
import { getDetails } from "@/lib/tmdb/api";
import type { LibraryEntry, LibraryStatus } from "./types";
import { nextEpisode } from "./progress";
import type { MediaDetails, MediaSummary, MediaType } from "@/lib/tmdb/types";

export type LibraryRow = typeof libraryItem.$inferSelect;

export async function getEntry(userId: string, type: MediaType, tmdbId: number): Promise<LibraryEntry | null> {
  const row = await db.query.libraryItem.findFirst({
    where: and(eq(libraryItem.userId, userId), eq(libraryItem.mediaType, type), eq(libraryItem.tmdbId, tmdbId)),
    columns: { status: true, rating: true, favorite: true },
  });
  return row ?? null;
}

/** "season-episode" keys */
export async function getWatchedEpisodes(userId: string, tvId: number): Promise<string[]> {
  const rows = await db
    .select({ s: episodeWatch.season, e: episodeWatch.episode })
    .from(episodeWatch)
    .where(and(eq(episodeWatch.userId, userId), eq(episodeWatch.tvId, tvId)));
  return rows.map((r) => `${r.s}-${r.e}`);
}

export type LibraryView = "pendientes" | "viendo" | "vistas" | "valoradas" | "favoritas";

export async function getLibrary(userId: string, view: LibraryView, type?: MediaType): Promise<LibraryRow[]> {
  const byView = {
    pendientes: eq(libraryItem.status, "watchlist" as LibraryStatus),
    viendo: eq(libraryItem.status, "watching" as LibraryStatus),
    vistas: eq(libraryItem.status, "completed" as LibraryStatus),
    valoradas: isNotNull(libraryItem.rating),
    favoritas: eq(libraryItem.favorite, true),
  }[view];
  return db
    .select()
    .from(libraryItem)
    .where(and(eq(libraryItem.userId, userId), byView, type ? eq(libraryItem.mediaType, type) : undefined))
    .orderBy(view === "valoradas" ? desc(libraryItem.rating) : desc(libraryItem.updatedAt), desc(libraryItem.updatedAt))
    .limit(500);
}

export async function getLibraryCounts(userId: string) {
  const rows = await db
    .select({ status: libraryItem.status, rating: libraryItem.rating, favorite: libraryItem.favorite })
    .from(libraryItem)
    .where(eq(libraryItem.userId, userId));
  return {
    pendientes: rows.filter((r) => r.status === "watchlist").length,
    viendo: rows.filter((r) => r.status === "watching").length,
    vistas: rows.filter((r) => r.status === "completed").length,
    valoradas: rows.filter((r) => r.rating !== null).length,
    favoritas: rows.filter((r) => r.favorite).length,
  } satisfies Record<LibraryView, number>;
}

/* ---------------------------------------------------- continue watching */

export interface ShowProgress {
  show: MediaDetails;
  watched: number;
  aired: number;
  next: { season: number; episode: number } | null;
  caughtUp: boolean;
}

/** Episodes aired so far, per season, from the show's details. */
export function airedEpisodes(show: MediaDetails): { season: number; count: number }[] {
  const last = show.last_episode_to_air;
  return (show.seasons ?? [])
    .filter((s) => s.season_number > 0)
    .map((s) => {
      if (!last) return { season: s.season_number, count: 0 };
      if (s.season_number < last.season_number) return { season: s.season_number, count: s.episode_count };
      if (s.season_number === last.season_number) return { season: s.season_number, count: last.episode_number };
      return { season: s.season_number, count: 0 };
    })
    .filter((s) => s.count > 0);
}

export function computeProgress(show: MediaDetails, watchedKeys: Set<string>): ShowProgress {
  const aired = airedEpisodes(show);
  const total = aired.reduce((n, s) => n + s.count, 0);
  const next = nextEpisode(aired.map((s) => ({ season: s.season, aired: s.count })), watchedKeys);
  const watched = [...watchedKeys].filter((k) => !k.startsWith("0-")).length;
  return { show, watched, aired: total, next, caughtUp: !next };
}

export async function getContinueWatching(userId: string, limit = 12): Promise<ShowProgress[]> {
  const shows = await db
    .select({ tmdbId: libraryItem.tmdbId })
    .from(libraryItem)
    .where(and(eq(libraryItem.userId, userId), eq(libraryItem.mediaType, "tv"), eq(libraryItem.status, "watching")))
    .orderBy(desc(libraryItem.updatedAt))
    .limit(limit);
  if (!shows.length) return [];

  const ids = shows.map((s) => s.tmdbId);
  const watches = await db
    .select({ tvId: episodeWatch.tvId, s: episodeWatch.season, e: episodeWatch.episode })
    .from(episodeWatch)
    .where(and(eq(episodeWatch.userId, userId), inArray(episodeWatch.tvId, ids)));
  const byShow = new Map<number, Set<string>>();
  for (const w of watches) {
    if (!byShow.has(w.tvId)) byShow.set(w.tvId, new Set());
    byShow.get(w.tvId)!.add(`${w.s}-${w.e}`);
  }

  const details = await Promise.all(ids.map((id) => getDetails("tv", id)));
  return details
    .filter((d): d is MediaDetails => !!d)
    .map((d) => computeProgress(d, byShow.get(d.id) ?? new Set()));
}

/* ------------------------------------- watchlist ∩ my streaming services */

export async function getWatchlistOnMyPlatforms(
  userId: string,
  providerIds: number[],
): Promise<{ media: MediaSummary; providers: { provider_id: number; provider_name: string; logo_path: string }[] }[]> {
  if (!providerIds.length) return [];
  const rows = await db
    .select({ mediaType: libraryItem.mediaType, tmdbId: libraryItem.tmdbId })
    .from(libraryItem)
    .where(and(eq(libraryItem.userId, userId), eq(libraryItem.status, "watchlist")))
    .orderBy(desc(libraryItem.updatedAt))
    .limit(40);
  const mine = new Set(providerIds);
  const details = await Promise.all(rows.map((r) => getDetails(r.mediaType, r.tmdbId)));
  return details
    .filter((d): d is MediaDetails => !!d)
    .map((d) => {
      const a = d.availability;
      const providers = [...(a?.flatrate ?? []), ...(a?.free ?? []), ...(a?.ads ?? [])].filter((p) => mine.has(p.provider_id));
      return { media: d as MediaSummary, providers };
    })
    .filter((x) => x.providers.length > 0);
}

/* ---------------------------------------------------- platforms in DB */

export async function getUserProviderIds(userId: string): Promise<number[]> {
  const rows = await db.select({ id: userProvider.providerId }).from(userProvider).where(eq(userProvider.userId, userId));
  return rows.map((r) => r.id);
}

export async function replaceUserProviders(userId: string, ids: number[]) {
  const del = db.delete(userProvider).where(eq(userProvider.userId, userId));
  if (!ids.length) return void (await del);
  await db.batch([del, db.insert(userProvider).values(ids.map((providerId) => ({ userId, providerId })))]);
}
