import Image from "next/image";
import Link from "next/link";

import { Rating } from "@/components/ui/rating";
import { mediaHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MediaSummary } from "@/lib/tmdb/types";

/* --------------------------------------------------------------- bento */

/** Mosaic: one large card + four small ones. Good for "in cinemas now". */
export function BentoSection({
  title,
  eyebrow,
  icon,
  items,
  badge,
}: {
  title: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  items: MediaSummary[];
  badge?: string;
}) {
  const picks = items.filter((m) => m.backdrop_path).slice(0, 5);
  if (picks.length < 3) return null;
  return (
    <section className="container-page py-8 md:py-10">
      <header className="mb-4">
        {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-widest text-accent">{eyebrow}</p>}
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
          {icon} {title}
        </h2>
      </header>
      <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:h-[560px] md:auto-rows-auto md:grid-cols-4 md:grid-rows-2 md:gap-4">
        {picks.map((m, i) => (
          <BentoCard key={m.id} media={m} big={i === 0} badge={badge} className={i === 0 ? "col-span-2 row-span-2" : ""} />
        ))}
      </div>
    </section>
  );
}

function BentoCard({ media, big, badge, className }: { media: MediaSummary; big?: boolean; badge?: string; className?: string }) {
  return (
    <Link
      href={mediaHref(media)}
      className={cn(
        "group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-line outline-none transition hover:ring-line-strong focus-visible:ring-2 focus-visible:ring-accent md:p-5",
        big && "md:p-8",
        className,
      )}
    >
      <Image
        src={media.backdrop_path!}
        alt=""
        fill
        sizes={big ? "(min-width:768px) 50vw, 100vw" : "(min-width:768px) 25vw, 50vw"}
        className="-z-10 object-cover transition duration-700 ease-out-expo group-hover:scale-105"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      {badge && (
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-md md:left-4 md:top-4">
          {badge}
        </span>
      )}
      <p className={cn("line-clamp-2 font-bold tracking-tight", big ? "text-2xl md:text-4xl" : "text-sm md:text-base")}>{media.title}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
        {media.vote_count >= 20 && <Rating value={media.vote_average} votes={media.vote_count} />}
        {media.date && <span>{year(media.date)}</span>}
      </div>
      {big && media.overview && <p className="mt-3 hidden max-w-lg text-sm leading-relaxed text-white/75 md:line-clamp-2">{media.overview}</p>}
    </Link>
  );
}

/* ------------------------------------------------------------ timeline */

const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const month = new Intl.DateTimeFormat("es-ES", { month: "short" });

/** Release calendar: a horizontal timeline with the date as the protagonist. */
export function TimelineCard({ media, showDate = true }: { media: MediaSummary; showDate?: boolean }) {
  const d = media.date ? new Date(media.date + "T00:00:00") : null;
  return (
    <Link href={mediaHref(media)} className="group block outline-none">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("shrink-0 rounded-full", showDate ? "size-2.5 bg-accent shadow-[0_0_12px_var(--accent)]" : "size-1.5 bg-line-strong")} />
        <span className={cn("h-px flex-1", showDate ? "bg-gradient-to-r from-accent/60 to-line" : "bg-line")} />
      </div>
      {d && !showDate && <p className="mb-2 h-8" aria-hidden />}
      {d && showDate && (
        <p className="mb-2 flex h-8 items-end gap-1.5">
          <span className="text-3xl font-black tabular-nums leading-none tracking-tight">{d.getDate()}</span>
          <span className="text-sm font-semibold uppercase text-accent">{month.format(d).replace(".", "")}</span>
          <span className="text-xs uppercase text-subtle">{weekday.format(d).replace(".", "")}</span>
        </p>
      )}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-1 ring-line transition duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:ring-line-strong group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {media.poster_path && <Image src={media.poster_path} alt={media.title} fill sizes="(min-width:1024px) 15vw, 40vw" className="object-cover" />}
      </div>
      <p className="mt-2.5 line-clamp-1 text-sm font-medium">{media.title}</p>
    </Link>
  );
}

/* ----------------------------------------------------------- landscape */

/** Wide card using the backdrop: a change of rhythm between poster rails. */
export function LandscapeCard({ media }: { media: MediaSummary }) {
  return (
    <Link href={mediaHref(media)} className="group block outline-none">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface ring-1 ring-line transition group-hover:ring-line-strong group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {media.backdrop_path && (
          <Image src={media.backdrop_path} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 45vw, 80vw" className="object-cover transition duration-700 ease-out-expo group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-1 font-semibold">{media.title}</p>
          <div className="flex items-center gap-2 text-xs text-white/70">
            {media.vote_count >= 20 && <Rating value={media.vote_average} votes={media.vote_count} />}
            {media.date && <span>Desde {year(media.date)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

