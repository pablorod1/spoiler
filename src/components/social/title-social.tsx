import Link from "next/link";
import { MessageSquareText, Star, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { requestNow } from "@/lib/now";
import { getCommunityRating, getFriendsOnTitle, getReviews } from "@/lib/social/queries";
import { stars } from "@/lib/library/types";
import { Avatar } from "./avatar";
import { ReviewCard } from "./review-card";
import type { MediaDetails } from "@/lib/tmdb/types";

const STATUS: Record<string, string> = { completed: "La ha visto", watching: "La está viendo", watchlist: "Quiere verla", dropped: "La dejó" };

/** Friends' opinions, community rating and reviews. Request-time: render inside <Suspense>. */
export async function TitleSocial({ media }: { media: MediaDetails }) {
  const [session, now] = await Promise.all([getSession(), requestNow()]);
  const [friends, community, reviews] = await Promise.all([
    session ? getFriendsOnTitle(session.user.id, media.media_type, media.id) : Promise.resolve([]),
    getCommunityRating(media.media_type, media.id),
    getReviews(media.media_type, media.id, 20),
  ]);

  const friendIds = new Set(friends.map((f) => f.user.userId));
  const sortedReviews = [...reviews].sort((a, b) => Number(friendIds.has(b.user.userId)) - Number(friendIds.has(a.user.userId)));
  const rated = friends.filter((f) => f.rating);
  const friendsAvg = rated.length ? rated.reduce((n, f) => n + f.rating!, 0) / rated.length : null;

  if (!friends.length && !community.count && !reviews.length) {
    return (
      <section className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
        <p className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-accent" />
          Nadie ha opinado todavía sobre <strong className="text-fg">{media.title}</strong>. ¡Sé el primero!
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {friends.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-accent" /> Tus amigos
              {friendsAvg && (
                <span className="ml-auto inline-flex items-center gap-1 text-accent">
                  <Star className="size-3.5 fill-current" /> {stars(friendsAvg)}
                </span>
              )}
            </h2>
            <ul className="space-y-2">
              {friends.slice(0, 6).map((f) => (
                <li key={f.user.userId} className="flex items-center gap-3 text-sm">
                  <Link href={`/u/${f.user.username}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:text-accent">
                    <Avatar user={f.user} size={28} />
                    <span className="truncate font-medium">{f.user.name}</span>
                  </Link>
                  {f.rating ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                      <Star className="size-3 fill-current" /> {stars(f.rating)}
                    </span>
                  ) : (
                    <span className="text-xs text-subtle">{f.status ? STATUS[f.status] : ""}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {community.count > 0 && (
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface/60 p-5">
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-accent/15 text-lg font-bold text-accent">{stars(community.avg ?? 0)}</div>
            <div className="text-sm">
              <p className="font-semibold">Nota en Whatcher</p>
              <p className="text-muted">
                {community.count} {community.count === 1 ? "valoración" : "valoraciones"}
              </p>
            </div>
          </div>
        )}
      </div>

      {sortedReviews.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <MessageSquareText className="size-5 text-accent" /> Reseñas <span className="text-subtle">· {sortedReviews.length}</span>
          </h2>
          <div className="space-y-3">
            {sortedReviews.map((r) => (
              <ReviewCard key={r.user.userId} review={r.review!} spoiler={r.reviewSpoiler} rating={r.rating} date={r.reviewedAt} now={now} author={r.user} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
