import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const LIBRARY_STATUSES = ["watchlist", "watching", "completed", "dropped"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

/**
 * One row per (user, title). Holds status, rating and a small snapshot of
 * TMDB data so library pages render without calling TMDB for every item.
 */
export const libraryItem = sqliteTable(
  "library_item",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    status: text("status", { enum: LIBRARY_STATUSES }),
    /** 1–10 (half stars: 7 = 3.5★) */
    rating: integer("rating"),
    favorite: integer("favorite", { mode: "boolean" }).default(false).notNull(),
    review: text("review"),
    reviewSpoiler: integer("review_spoiler", { mode: "boolean" }).default(false).notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    // snapshot
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: text("release_date"),
    // dates
    watchedAt: integer("watched_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.mediaType, t.tmdbId] }),
    index("library_user_status_idx").on(t.userId, t.status, t.updatedAt),
    index("library_title_idx").on(t.mediaType, t.tmdbId),
  ],
);

/** Episode-level tracking for TV shows. */
export const episodeWatch = sqliteTable(
  "episode_watch",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tvId: integer("tv_id").notNull(),
    season: integer("season").notNull(),
    episode: integer("episode").notNull(),
    watchedAt: integer("watched_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.tvId, t.season, t.episode] }),
    index("episode_user_watched_idx").on(t.userId, t.watchedAt),
  ],
);

/** The streaming services a user subscribes to. */
export const userProvider = sqliteTable(
  "user_provider",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: integer("provider_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.providerId] })],
);

/* ------------------------------------------------------------- social */

/** Public identity. Created on sign-up (see auth.ts) with a generated username. */
export const profile = sqliteTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  bio: text("bio"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
});

export const follow = sqliteTable(
  "follow",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] }), index("follow_following_idx").on(t.followingId)],
);

export const ACTIVITY_KINDS = ["watched", "rated", "watchlist", "favorite", "review", "episodes", "finished_show", "list_add"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Append-only feed of things users do (coalesced for episodes). */
export const activity = sqliteTable(
  "activity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ACTIVITY_KINDS }).notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    rating: integer("rating"),
    /** small JSON payload: { count, season, episode, listId, listTitle } */
    data: text("data", { mode: "json" }).$type<Record<string, string | number>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [index("activity_user_idx").on(t.userId, t.createdAt), index("activity_created_idx").on(t.createdAt)],
);

export const list = sqliteTable(
  "list",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    isPublic: integer("is_public", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("list_user_idx").on(t.userId, t.updatedAt)],
);

export const listItem = sqliteTable(
  "list_item",
  {
    listId: text("list_id")
      .notNull()
      .references(() => list.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    releaseDate: text("release_date"),
    note: text("note"),
    position: integer("position").notNull(),
    addedAt: integer("added_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.mediaType, t.tmdbId] })],
);
