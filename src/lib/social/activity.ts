import "server-only";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activity, type ActivityKind } from "@/lib/db/schema";
import type { MediaSnapshot } from "@/lib/library/types";

/** Repeated actions on the same title within this window update the previous row instead of adding noise. */
const COALESCE_MS = 6 * 60 * 60 * 1000;

export async function logActivity(
  userId: string,
  kind: ActivityKind,
  m: MediaSnapshot,
  extra: { rating?: number | null; data?: Record<string, string | number> } = {},
) {
  const since = new Date(Date.now() - COALESCE_MS);
  const recent = await db.query.activity.findFirst({
    where: and(
      eq(activity.userId, userId),
      eq(activity.kind, kind),
      eq(activity.mediaType, m.mediaType),
      eq(activity.tmdbId, m.tmdbId),
      gt(activity.createdAt, since),
    ),
    orderBy: desc(activity.createdAt),
  });

  if (recent) {
    let data = extra.data ?? recent.data ?? undefined;
    if (kind === "episodes" && extra.data) {
      const prev = Number(recent.data?.count ?? 0);
      data = { ...extra.data, count: prev + Number(extra.data.count ?? 0) };
    }
    await db
      .update(activity)
      .set({ rating: extra.rating ?? recent.rating, data, createdAt: new Date(), title: m.title, posterPath: m.posterPath })
      .where(eq(activity.id, recent.id));
    return;
  }

  await db.insert(activity).values({
    userId,
    kind,
    mediaType: m.mediaType,
    tmdbId: m.tmdbId,
    title: m.title,
    posterPath: m.posterPath,
    rating: extra.rating ?? null,
    data: extra.data,
  });
}

/** Undo: e.g. removing from watchlist removes the "added to watchlist" entry. */
export async function removeActivity(userId: string, kinds: ActivityKind[], m: Pick<MediaSnapshot, "mediaType" | "tmdbId">) {
  await db
    .delete(activity)
    .where(
      and(
        eq(activity.userId, userId),
        inArray(activity.kind, kinds),
        eq(activity.mediaType, m.mediaType),
        eq(activity.tmdbId, m.tmdbId),
      ),
    );
}
