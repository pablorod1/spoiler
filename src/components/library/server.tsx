import { getSession } from "@/lib/session";
import { getEntry, getWatchedEpisodes, airedEpisodes } from "@/lib/library/queries";
import { mediaHref } from "@/lib/tmdb/normalize";
import { LibraryControls } from "./library-controls";
import { SeasonTracker } from "./season-tracker";
import { AddToList, ReviewButton } from "@/components/social/title-tools";
import { getMyListsForTitle } from "@/lib/social/queries";
import type { MediaSnapshot } from "@/lib/library/types";
import type { MediaDetails } from "@/lib/tmdb/types";

export const toSnapshot = (m: MediaDetails): MediaSnapshot => ({
  mediaType: m.media_type,
  tmdbId: m.id,
  title: m.title,
  posterPath: m.poster_path,
  backdropPath: m.backdrop_path,
  releaseDate: m.date,
});

const loginFor = (m: MediaDetails) => `/entrar?volver=${encodeURIComponent(mediaHref(m))}`;

/** Request-time (session): render inside <Suspense>. */
export async function LibraryActions({ media }: { media: MediaDetails }) {
  const session = await getSession();
  const [entry, lists] = session
    ? await Promise.all([getEntry(session.user.id, media.media_type, media.id), getMyListsForTitle(session.user.id, media.media_type, media.id)])
    : [null, []];
  const snapshot = toSnapshot(media);
  const loginHref = session ? undefined : loginFor(media);
  return (
    <div className="space-y-3">
      <LibraryControls media={snapshot} initial={entry} loginHref={loginHref} />
      <div className="flex flex-wrap gap-3">
        <AddToList media={snapshot} lists={lists} loginHref={loginHref} />
        <ReviewButton media={snapshot} initial={{ review: entry?.review ?? null, spoiler: entry?.reviewSpoiler ?? false }} loginHref={loginHref} />
      </div>
    </div>
  );
}

export async function TvTracker({ show }: { show: MediaDetails }) {
  const session = await getSession();
  const watched = session ? await getWatchedEpisodes(session.user.id, show.id) : [];
  const aired = new Map(airedEpisodes(show).map((s) => [s.season, s.count]));
  const seasons = (show.seasons ?? []).map((s) => ({
    season_number: s.season_number,
    name: s.name,
    episode_count: s.episode_count,
    aired: aired.get(s.season_number) ?? 0,
    air_date: s.air_date,
    poster_path: s.poster_path ?? show.poster_path,
  }));
  return (
    <SeasonTracker
      media={toSnapshot(show)}
      seasons={seasons}
      initialWatched={watched}
      loginHref={session ? undefined : loginFor(show)}
    />
  );
}
