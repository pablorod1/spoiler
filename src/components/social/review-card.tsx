import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Avatar } from "./avatar";
import { SpoilerText } from "./spoiler-text";
import { mediaHref } from "@/lib/tmdb/normalize";
import { stars } from "@/lib/library/types";
import { timeAgo } from "@/lib/format";
import type { PublicUser } from "@/lib/social/queries";

/** A review shown either by author (on a title page) or by title (on a profile). */
export function ReviewCard({
  review,
  spoiler,
  rating,
  date,
  now,
  author,
  media,
}: {
  review: string;
  spoiler: boolean;
  rating: number | null;
  date: Date | null;
  now: number;
  author?: PublicUser;
  media?: { id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null };
}) {
  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-surface/50 p-4">
      {media && (
        <Link href={mediaHref(media)} className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {media.poster_path && <Image src={media.poster_path} alt="" fill sizes="92px" className="object-cover" />}
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <header className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          {author && (
            <Link href={`/u/${author.username}`} className="flex items-center gap-2 font-semibold hover:text-accent">
              <Avatar user={author} size={26} />
              {author.name}
            </Link>
          )}
          {media && (
            <Link href={mediaHref(media)} className="font-semibold hover:text-accent">
              {media.title}
            </Link>
          )}
          {rating && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
              <Star className="size-3 fill-current" />
              {stars(rating)}
            </span>
          )}
          {date && <span className="text-xs text-subtle">{timeAgo(date, now)}</span>}
        </header>
        <SpoilerText text={review} spoiler={spoiler} />
      </div>
    </article>
  );
}
