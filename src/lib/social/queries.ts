import "server-only";
import { and, avg, count, desc, eq, inArray, isNotNull, ne, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activity, episodeWatch, follow, libraryItem, list, listItem, profile, user } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb/types";

/* ---------------------------------------------------------------- people */

export interface PublicUser {
  userId: string;
  username: string;
  name: string;
  image: string | null;
}

const publicUserCols = {
  userId: profile.userId,
  username: profile.username,
  name: user.name,
  image: user.image,
};

export async function getProfileByUsername(username: string) {
  const [row] = await db
    .select({ ...publicUserCols, bio: profile.bio, createdAt: profile.createdAt })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(profile.username, username.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  const [row] = await db.select(publicUserCols).from(profile).innerJoin(user, eq(user.id, profile.userId)).where(eq(profile.userId, userId)).limit(1);
  return row ?? null;
}

export async function getProfileStats(userId: string) {
  const [[lib], [eps], [followers], [following], [rated]] = await Promise.all([
    db
      .select({
        movies: sql<number>`sum(case when ${libraryItem.mediaType} = 'movie' and ${libraryItem.status} = 'completed' then 1 else 0 end)`,
        shows: sql<number>`sum(case when ${libraryItem.mediaType} = 'tv' and ${libraryItem.status} in ('completed','watching') then 1 else 0 end)`,
        reviews: sql<number>`sum(case when ${libraryItem.review} is not null then 1 else 0 end)`,
      })
      .from(libraryItem)
      .where(eq(libraryItem.userId, userId)),
    db.select({ n: count() }).from(episodeWatch).where(eq(episodeWatch.userId, userId)),
    db.select({ n: count() }).from(follow).where(eq(follow.followingId, userId)),
    db.select({ n: count() }).from(follow).where(eq(follow.followerId, userId)),
    db
      .select({ n: count(), avg: avg(libraryItem.rating) })
      .from(libraryItem)
      .where(and(eq(libraryItem.userId, userId), isNotNull(libraryItem.rating))),
  ]);
  return {
    movies: Number(lib?.movies ?? 0),
    shows: Number(lib?.shows ?? 0),
    reviews: Number(lib?.reviews ?? 0),
    episodes: eps?.n ?? 0,
    followers: followers?.n ?? 0,
    following: following?.n ?? 0,
    ratings: rated?.n ?? 0,
    avgRating: rated?.avg ? Number(rated.avg) : null,
  };
}

export async function isFollowing(viewerId: string, targetId: string) {
  const row = await db.query.follow.findFirst({
    where: and(eq(follow.followerId, viewerId), eq(follow.followingId, targetId)),
    columns: { followerId: true },
  });
  return Boolean(row);
}

export async function getFollowingIds(userId: string) {
  const rows = await db.select({ id: follow.followingId }).from(follow).where(eq(follow.followerId, userId));
  return rows.map((r) => r.id);
}

export async function getFollowList(userId: string, which: "followers" | "following"): Promise<PublicUser[]> {
  const joinOn = which === "followers" ? follow.followerId : follow.followingId;
  const filter = which === "followers" ? follow.followingId : follow.followerId;
  return db
    .select(publicUserCols)
    .from(follow)
    .innerJoin(profile, eq(profile.userId, joinOn))
    .innerJoin(user, eq(user.id, joinOn))
    .where(eq(filter, userId))
    .orderBy(desc(follow.createdAt))
    .limit(200);
}

/** Active users the viewer doesn't follow yet. */
export async function getSuggestedUsers(viewerId: string | null, limit = 8): Promise<(PublicUser & { activity: number })[]> {
  const exclude = viewerId ? [viewerId, ...(await getFollowingIds(viewerId))] : [];
  return db
    .select({ ...publicUserCols, activity: count(activity.id) })
    .from(activity)
    .innerJoin(profile, eq(profile.userId, activity.userId))
    .innerJoin(user, eq(user.id, activity.userId))
    .where(exclude.length ? notInArray(activity.userId, exclude) : undefined)
    .groupBy(activity.userId)
    .orderBy(desc(count(activity.id)))
    .limit(limit);
}

export async function searchUsers(q: string, limit = 4): Promise<PublicUser[]> {
  const term = q.trim().replace(/^@/, "").toLowerCase();
  if (term.length < 2) return [];
  // Escape LIKE wildcards instead of stripping them: usernames contain "_".
  const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .select(publicUserCols)
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(or(sql`${profile.username} like ${pattern} escape '\\'`, sql`lower(${user.name}) like ${pattern} escape '\\'`))
    .limit(limit);
}

/* ------------------------------------------------------------- activity */

export type ActivityRow = typeof activity.$inferSelect & { user: PublicUser };

async function activityWhere(where: ReturnType<typeof eq> | undefined, limit: number): Promise<ActivityRow[]> {
  const rows = await db
    .select({ a: activity, u: publicUserCols })
    .from(activity)
    .innerJoin(profile, eq(profile.userId, activity.userId))
    .innerJoin(user, eq(user.id, activity.userId))
    .where(where)
    .orderBy(desc(activity.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.a, user: r.u }));
}

export const getUserActivity = (userId: string, limit = 30) => activityWhere(eq(activity.userId, userId), limit);

/** Your activity + people you follow. */
export async function getFeed(viewerId: string, limit = 50) {
  const ids = [viewerId, ...(await getFollowingIds(viewerId))];
  return activityWhere(inArray(activity.userId, ids) as ReturnType<typeof eq>, limit);
}

/** Recent activity from everyone (discovery when you follow nobody). */
export const getGlobalActivity = (limit = 30, excludeUserId?: string) =>
  activityWhere(excludeUserId ? (ne(activity.userId, excludeUserId) as ReturnType<typeof eq>) : undefined, limit);

/* ------------------------------------------------- per-title social data */

export interface TitleOpinion {
  user: PublicUser;
  status: string | null;
  rating: number | null;
  review: string | null;
  reviewSpoiler: boolean;
  reviewedAt: Date | null;
}

async function opinions(type: MediaType, tmdbId: number, userFilter?: string[], onlyReviews = false, limit = 50): Promise<TitleOpinion[]> {
  if (userFilter && !userFilter.length) return [];
  const rows = await db
    .select({
      u: publicUserCols,
      status: libraryItem.status,
      rating: libraryItem.rating,
      review: libraryItem.review,
      reviewSpoiler: libraryItem.reviewSpoiler,
      reviewedAt: libraryItem.reviewedAt,
    })
    .from(libraryItem)
    .innerJoin(profile, eq(profile.userId, libraryItem.userId))
    .innerJoin(user, eq(user.id, libraryItem.userId))
    .where(
      and(
        eq(libraryItem.mediaType, type),
        eq(libraryItem.tmdbId, tmdbId),
        userFilter ? inArray(libraryItem.userId, userFilter) : undefined,
        onlyReviews ? isNotNull(libraryItem.review) : or(isNotNull(libraryItem.rating), isNotNull(libraryItem.review), inArray(libraryItem.status, ["completed", "watching"])),
      ),
    )
    .orderBy(desc(libraryItem.reviewedAt), desc(libraryItem.updatedAt))
    .limit(limit);
  return rows.map((r) => ({ user: r.u, status: r.status, rating: r.rating, review: r.review, reviewSpoiler: r.reviewSpoiler, reviewedAt: r.reviewedAt }));
}

export async function getFriendsOnTitle(viewerId: string, type: MediaType, tmdbId: number) {
  return opinions(type, tmdbId, await getFollowingIds(viewerId));
}

export const getReviews = (type: MediaType, tmdbId: number, limit = 30) => opinions(type, tmdbId, undefined, true, limit);

/** Average Whatcher rating for a title (all users). */
export async function getCommunityRating(type: MediaType, tmdbId: number) {
  const [row] = await db
    .select({ n: count(), avg: avg(libraryItem.rating) })
    .from(libraryItem)
    .where(and(eq(libraryItem.mediaType, type), eq(libraryItem.tmdbId, tmdbId), isNotNull(libraryItem.rating)));
  return { count: row?.n ?? 0, avg: row?.avg ? Number(row.avg) : null };
}

/* ---------------------------------------------------------------- lists */

export type ListRow = typeof list.$inferSelect;

export async function getUserLists(userId: string, includePrivate: boolean) {
  const rows = await db
    .select({ l: list, n: count(listItem.tmdbId) })
    .from(list)
    .leftJoin(listItem, eq(listItem.listId, list.id))
    .where(and(eq(list.userId, userId), includePrivate ? undefined : eq(list.isPublic, true)))
    .groupBy(list.id)
    .orderBy(desc(list.updatedAt));
  const ids = rows.map((r) => r.l.id);
  const covers = ids.length
    ? await db
        .select({ listId: listItem.listId, posterPath: listItem.posterPath, position: listItem.position })
        .from(listItem)
        .where(inArray(listItem.listId, ids))
        .orderBy(listItem.position)
    : [];
  return rows.map((r) => ({
    ...r.l,
    count: r.n,
    covers: covers.filter((c) => c.listId === r.l.id && c.posterPath).slice(0, 4).map((c) => c.posterPath!),
  }));
}

export async function getList(id: string) {
  const [row] = await db
    .select({ l: list, u: publicUserCols })
    .from(list)
    .innerJoin(profile, eq(profile.userId, list.userId))
    .innerJoin(user, eq(user.id, list.userId))
    .where(eq(list.id, id))
    .limit(1);
  if (!row) return null;
  const items = await db.select().from(listItem).where(eq(listItem.listId, id)).orderBy(listItem.position);
  return { ...row.l, owner: row.u, items };
}

/** The viewer's lists, flagging which already contain this title. */
export async function getMyListsForTitle(userId: string, type: MediaType, tmdbId: number) {
  const lists = await db.select({ id: list.id, title: list.title, isPublic: list.isPublic }).from(list).where(eq(list.userId, userId)).orderBy(desc(list.updatedAt));
  if (!lists.length) return [];
  const contains = await db
    .select({ listId: listItem.listId })
    .from(listItem)
    .where(and(inArray(listItem.listId, lists.map((l) => l.id)), eq(listItem.mediaType, type), eq(listItem.tmdbId, tmdbId)));
  const set = new Set(contains.map((c) => c.listId));
  return lists.map((l) => ({ ...l, contains: set.has(l.id) }));
}

/* ------------------------------------------------------ profile shelves */

export async function getUserShelf(userId: string, shelf: "valoradas" | "favoritas" | "resenas", limit = 60) {
  const where = {
    valoradas: isNotNull(libraryItem.rating),
    favoritas: eq(libraryItem.favorite, true),
    resenas: isNotNull(libraryItem.review),
  }[shelf];
  return db
    .select()
    .from(libraryItem)
    .where(and(eq(libraryItem.userId, userId), where))
    .orderBy(shelf === "valoradas" ? desc(libraryItem.rating) : shelf === "resenas" ? desc(libraryItem.reviewedAt) : desc(libraryItem.updatedAt), desc(libraryItem.updatedAt))
    .limit(limit);
}
