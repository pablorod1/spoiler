import Link from "next/link";
import Image from "next/image";
import { Star, Heart, Bookmark, Eye, Tv, MessageSquareText, ListPlus, Trophy } from "lucide-react";
import { Avatar } from "./avatar";
import { mediaHref } from "@/lib/tmdb/normalize";
import { stars } from "@/lib/library/types";
import { timeAgo } from "@/lib/format";
import type { ActivityRow } from "@/lib/social/queries";

const VERB: Record<ActivityRow["kind"], { icon: typeof Star; text: (a: ActivityRow) => React.ReactNode }> = {
  watched: { icon: Eye, text: () => "ha visto" },
  rated: {
    icon: Star,
    text: (a) => (
      <>
        ha valorado con <span className="font-semibold text-accent">{stars(a.rating ?? 0)} ★</span>
      </>
    ),
  },
  watchlist: { icon: Bookmark, text: () => "quiere ver" },
  favorite: { icon: Heart, text: () => "ha añadido a favoritas" },
  review: { icon: MessageSquareText, text: () => "ha escrito una reseña de" },
  episodes: {
    icon: Tv,
    text: (a) => {
      const n = Number(a.data?.count ?? 1);
      return n > 1 ? <>ha visto {n} episodios de</> : <>ha visto T{a.data?.season}·E{a.data?.episode} de</>;
    },
  },
  finished_show: { icon: Trophy, text: () => "ha terminado" },
  list_add: { icon: ListPlus, text: () => "ha añadido" },
};

export function ActivityItem({ a, now, showUser = true }: { a: ActivityRow; now: number; showUser?: boolean }) {
  const verb = VERB[a.kind];
  const Icon = verb.icon;
  const href = mediaHref({ id: a.tmdbId, media_type: a.mediaType, title: a.title });
  return (
    <li className="flex items-start gap-3 py-3.5">
      {showUser ? (
        <Link href={`/u/${a.user.username}`} className="mt-0.5">
          <Avatar user={a.user} size={36} />
        </Link>
      ) : (
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-accent">
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <p className="text-muted">
          {showUser && (
            <Link href={`/u/${a.user.username}`} className="font-semibold text-fg hover:text-accent">
              {a.user.name}
            </Link>
          )}{" "}
          {verb.text(a)}{" "}
          <Link href={href} className="font-semibold text-fg hover:text-accent">
            {a.title}
          </Link>
          {a.kind === "list_add" && (
            <>
              {" "}a{" "}
              <Link href={`/listas/${a.data?.listId}`} className="font-semibold text-fg hover:text-accent">
                {String(a.data?.listTitle ?? "una lista")}
              </Link>
            </>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
          {showUser && <Icon className="size-3" />}
          {timeAgo(a.createdAt, now)}
        </p>
      </div>
      <Link href={href} className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-line">
        {a.posterPath && <Image src={a.posterPath} alt="" fill sizes="92px" className="object-cover" />}
      </Link>
    </li>
  );
}
