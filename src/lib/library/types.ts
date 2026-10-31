import type { LibraryStatus } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb/types";

export type { LibraryStatus };

/** Minimal TMDB snapshot stored with each library row. */
export interface MediaSnapshot {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
}

export interface LibraryEntry {
  status: LibraryStatus | null;
  rating: number | null;
  favorite: boolean;
}

export type ActionResult = { ok: true } | { ok: false; error: "auth" | "invalid" };

export const STATUS_LABEL: Record<MediaType, Record<LibraryStatus, string>> = {
  movie: { watchlist: "En mi lista", watching: "Viendo", completed: "Vista", dropped: "Abandonada" },
  tv: { watchlist: "En mi lista", watching: "Viendo", completed: "Terminada", dropped: "Abandonada" },
};

/** 1–10 -> "3,5" */
export const stars = (rating: number) => (rating / 2).toLocaleString("es-ES", { maximumFractionDigits: 1 });
