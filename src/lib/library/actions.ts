"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { episodeWatch, libraryItem, LIBRARY_STATUSES } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";
import type { ActionResult, LibraryStatus, MediaSnapshot } from "./types";
import { logActivity, removeActivity } from "@/lib/social/activity";

function validSnapshot(m: MediaSnapshot) {
  return (
    (m.mediaType === "movie" || m.mediaType === "tv") &&
    Number.isInteger(m.tmdbId) &&
    m.tmdbId > 0 &&
    typeof m.title === "string" &&
    m.title.length > 0 &&
    m.title.length < 300
  );
}

const snapshotValues = (m: MediaSnapshot) => ({
  title: m.title,
  posterPath: m.posterPath,
  backdropPath: m.backdropPath,
  releaseDate: m.releaseDate,
});

async function upsert(userId: string, m: MediaSnapshot, patch: Partial<typeof libraryItem.$inferInsert>) {
  await db
    .insert(libraryItem)
    .values({ userId, mediaType: m.mediaType, tmdbId: m.tmdbId, ...snapshotValues(m), ...patch })
    .onConflictDoUpdate({
      target: [libraryItem.userId, libraryItem.mediaType, libraryItem.tmdbId],
      set: { ...snapshotValues(m), ...patch, updatedAt: new Date() },
    });
}

export async function setStatus(m: MediaSnapshot, status: LibraryStatus | null): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "auth" };
  if (!validSnapshot(m) || (status !== null && !LIBRARY_STATUSES.includes(status))) return { ok: false, error: "invalid" };

  await upsert(userId, m, {
    status,
    watchedAt: status === "completed" ? new Date() : undefined,
  });
  if (status === "watchlist") await logActivity(userId, "watchlist", m);
  else await removeActivity(userId, ["watchlist"], m);
  if (status === "completed") await logActivity(userId, m.mediaType === "movie" ? "watched" : "finished_show", m);
  else await removeActivity(userId, ["watched", "finished_show"], m);
  revalidatePath("/mi-lista");
  return { ok: true };
}

export async function setRating(m: MediaSnapshot, rating: number | null): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "auth" };
  if (!validSnapshot(m) || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10)))
    return { ok: false, error: "invalid" };

  // Rating a movie implies you've seen it.
  const current = await db.query.libraryItem.findFirst({
    where: and(eq(libraryItem.userId, userId), eq(libraryItem.mediaType, m.mediaType), eq(libraryItem.tmdbId, m.tmdbId)),
    columns: { status: true },
  });
  const markSeen = rating !== null && m.mediaType === "movie" && current?.status !== "completed";
  await upsert(userId, m, {
    rating,
    ...(markSeen ? { status: "completed" as const, watchedAt: new Date() } : {}),
  });
  if (rating === null) await removeActivity(userId, ["rated"], m);
  else {
    if (markSeen) await removeActivity(userId, ["watchlist"], m);
    await logActivity(userId, "rated", m, { rating });
  }
  revalidatePath("/mi-lista");
  return { ok: true };
}

export async function toggleFavorite(m: MediaSnapshot, favorite: boolean): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "auth" };
  if (!validSnapshot(m)) return { ok: false, error: "invalid" };
  await upsert(userId, m, { favorite });
  if (favorite) await logActivity(userId, "favorite", m);
  else await removeActivity(userId, ["favorite"], m);
  revalidatePath("/mi-lista");
  return { ok: true };
}

/**
 * Mark/unmark a set of episodes. `airedTotal` is the number of aired episodes
 * of the whole show, used to flip the show to "completed" when caught up.
 */
export async function setEpisodesWatched(
  m: MediaSnapshot,
  episodes: { season: number; episode: number }[],
  watched: boolean,
  airedTotal: number,
): Promise<ActionResult & { watchedCount?: number }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "auth" };
  const valid =
    validSnapshot(m) &&
    m.mediaType === "tv" &&
    episodes.length > 0 &&
    episodes.length <= 500 &&
    episodes.every((e) => Number.isInteger(e.season) && Number.isInteger(e.episode) && e.season >= 0 && e.episode > 0);
  if (!valid) return { ok: false, error: "invalid" };

  if (watched) {
    await db
      .insert(episodeWatch)
      .values(episodes.map((e) => ({ userId, tvId: m.tmdbId, season: e.season, episode: e.episode })))
      .onConflictDoNothing();
  } else {
    const bySeason = new Map<number, number[]>();
    for (const e of episodes) bySeason.set(e.season, [...(bySeason.get(e.season) ?? []), e.episode]);
    for (const [season, eps] of bySeason) {
      await db
        .delete(episodeWatch)
        .where(
          and(
            eq(episodeWatch.userId, userId),
            eq(episodeWatch.tvId, m.tmdbId),
            eq(episodeWatch.season, season),
            inArray(episodeWatch.episode, eps),
          ),
        );
    }
  }

  const watchedCount = await db.$count(
    episodeWatch,
    and(eq(episodeWatch.userId, userId), eq(episodeWatch.tvId, m.tmdbId)),
  );
  const current = await db.query.libraryItem.findFirst({
    where: and(eq(libraryItem.userId, userId), eq(libraryItem.mediaType, "tv"), eq(libraryItem.tmdbId, m.tmdbId)),
    columns: { status: true },
  });

  let status: LibraryStatus | null | undefined;
  if (watchedCount > 0 && airedTotal > 0 && watchedCount >= airedTotal) status = "completed";
  else if (watchedCount > 0 && current?.status !== "dropped") status = "watching";
  else if (watchedCount === 0 && (current?.status === "watching" || current?.status === "completed")) status = "watchlist";

  if (status !== undefined || !current) {
    await upsert(userId, m, {
      status: status ?? current?.status ?? "watching",
      watchedAt: status === "completed" ? new Date() : undefined,
    });
  }

  if (watched) {
    const last = [...episodes].sort((a, b) => a.season - b.season || a.episode - b.episode).at(-1)!;
    await removeActivity(userId, ["watchlist"], m);
    await logActivity(userId, "episodes", m, { data: { count: episodes.length, season: last.season, episode: last.episode } });
    if (status === "completed" && current?.status !== "completed") await logActivity(userId, "finished_show", m);
  } else if (watchedCount === 0) {
    await removeActivity(userId, ["episodes", "finished_show"], m);
  }
  revalidatePath("/mi-lista");
  return { ok: true, watchedCount };
}

/* ---------------------------------------------------------------- reviews */

export async function saveReview(m: MediaSnapshot, text: string | null, spoiler: boolean): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "auth" };
  const clean = text?.trim() ?? "";
  if (!validSnapshot(m) || clean.length > 5000) return { ok: false, error: "invalid" };

  if (!clean) {
    await upsert(userId, m, { review: null, reviewSpoiler: false, reviewedAt: null });
    await removeActivity(userId, ["review"], m);
  } else {
    await upsert(userId, m, { review: clean, reviewSpoiler: spoiler, reviewedAt: new Date() });
    await logActivity(userId, "review", m);
  }
  revalidatePath("/mi-lista");
  return { ok: true };
}
