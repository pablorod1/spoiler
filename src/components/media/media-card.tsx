import Link from "next/link";
import { Film, Tv } from "lucide-react";
import { TmdbImage } from "@/components/ui/tmdb-image";
import { Rating } from "@/components/ui/rating";
import { mediaHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MediaSummary } from "@/lib/tmdb/types";

export const CARD_SIZES = "(min-width:1280px) 12vw, (min-width:1024px) 15vw, (min-width:768px) 20vw, (min-width:640px) 28vw, 42vw";

export function MediaCard({
  media,
  rank,
  subtitle,
  showType,
  priority,
  className,
}: {
  media: MediaSummary;
  rank?: number;
  subtitle?: string;
  showType?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const TypeIcon = media.media_type === "movie" ? Film : Tv;
  return (
    <Link
      href={mediaHref(media)}
      className={cn("group block w-full outline-none", className)}
      title={media.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-1 ring-line transition duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:ring-line-strong group-hover:shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)] group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <TmdbImage
          path={media.poster_path}
          alt={media.title}
          fill
          sizes={CARD_SIZES}
          priority={priority}
          className="object-cover transition duration-500 ease-out-expo group-hover:scale-[1.03]"
          fallback={<span className="font-medium text-muted">{media.title}</span>}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {media.vote_count >= 5 ? (
            <span className="rounded-md bg-black/70 px-1.5 py-0.5 backdrop-blur-md">
              <Rating value={media.vote_average} votes={media.vote_count} />
            </span>
          ) : (
            <span />
          )}
          {showType && (
            <span className="rounded-md bg-black/70 p-1 text-white/80 backdrop-blur-md" aria-label={media.media_type === "movie" ? "Película" : "Serie"}>
              <TypeIcon className="size-3" />
            </span>
          )}
        </div>
        {rank !== undefined && (
          <span className="pointer-events-none absolute -bottom-3 left-1 text-7xl font-black italic leading-none tracking-tighter text-white/90 [text-shadow:0_4px_24px_rgb(0_0_0/0.9)] [-webkit-text-stroke:1px_rgb(0_0_0/0.4)]">
            {rank}
          </span>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="line-clamp-1 text-sm font-medium text-fg/95 group-hover:text-white">{media.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-subtle">
          {subtitle ?? (year(media.date) || "Próximamente")}
        </p>
      </div>
    </Link>
  );
}
