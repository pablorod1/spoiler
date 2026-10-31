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
