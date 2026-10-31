import Link from "next/link";
import Image from "next/image";
import { Lock, ListVideo } from "lucide-react";

export function ListCard({
  l,
}: {
  l: { id: string; title: string; count: number; covers: string[]; isPublic: boolean; description: string | null };
}) {
  return (
    <Link href={`/listas/${l.id}`} className="group block outline-none">
      <div className="relative flex aspect-[16/10] items-end overflow-hidden rounded-xl bg-surface-2 p-3 ring-1 ring-line transition group-hover:ring-line-strong group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {l.covers.length ? (
          <div className="absolute inset-0 flex">
            {l.covers.map((c, i) => (
              <div key={c + i} className="relative h-full flex-1 overflow-hidden" style={{ marginLeft: i ? "-6%" : 0, zIndex: 10 - i }}>
                <Image src={c} alt="" fill sizes="160px" className="object-cover shadow-[-8px_0_16px_rgb(0_0_0/0.6)]" />
              </div>
            ))}
          </div>
        ) : (
          <ListVideo className="absolute inset-0 m-auto size-10 text-subtle" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="relative min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold">
            {!l.isPublic && <Lock className="size-3.5 shrink-0 text-muted" />}
            {l.title}
          </p>
          <p className="text-xs text-white/70">
            {l.count} {l.count === 1 ? "título" : "títulos"}
          </p>
        </div>
      </div>
    </Link>
  );
}
