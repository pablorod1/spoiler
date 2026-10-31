import Link from "next/link";
import Image from "next/image";
import { Play, CircleCheck } from "lucide-react";
import { mediaHref } from "@/lib/tmdb/normalize";
import type { ShowProgress } from "@/lib/library/queries";

/** Landscape card for "continue watching". */
export function ProgressCard({ p }: { p: ShowProgress }) {
  const pct = p.aired ? Math.min(100, (p.watched / p.aired) * 100) : 0;
  return (
    <Link href={mediaHref(p.show)} className="group block outline-none">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface ring-1 ring-line transition group-hover:ring-line-strong group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {p.show.backdrop_path && (
          <Image src={p.show.backdrop_path} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 40vw, 80vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black opacity-0 transition group-hover:opacity-100">
          <Play className="size-5 fill-current" />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-1 text-sm font-semibold">{p.show.title}</p>
          <p className="text-xs text-white/70">
            {p.next ? (
              <>Siguiente: T{p.next.season} · E{p.next.episode}</>
            ) : (
              <span className="inline-flex items-center gap-1 text-good">
                <CircleCheck className="size-3" /> Al día
                {p.show.next_episode_to_air?.air_date && ` · nuevo el ${new Date(p.show.next_episode_to_air.air_date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
              </span>
            )}
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <div className="h-full bg-good" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}
