import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { getSession } from "@/lib/session";
import { requestNow } from "@/lib/now";
import { getList } from "@/lib/social/queries";
import { Avatar } from "@/components/social/avatar";
import { MediaCard } from "@/components/media/media-card";
import { GRID } from "@/components/explore/infinite-grid";
import { ListEditor, RemoveItemButton, ShareButton } from "@/components/social/list-owner-tools";
import { GridSkeleton } from "@/components/ui/skeletons";
import { timeAgo } from "@/lib/format";
import type { MediaSummary } from "@/lib/tmdb/types";

export async function generateMetadata({ params }: PageProps<"/listas/[id]">): Promise<Metadata> {
  const l = await getList((await params).id);
  if (!l || !l.isPublic) return { title: "Lista" };
  return { title: `${l.title} — lista de ${l.owner.name}`, description: l.description ?? `${l.items.length} títulos` };
}

export default function Page(props: PageProps<"/listas/[id]">) {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <Suspense fallback={<GridSkeleton />}>
        <ListView {...props} />
      </Suspense>
    </main>
  );
}

async function ListView({ params }: PageProps<"/listas/[id]">) {
  const [{ id }, now] = await Promise.all([params, requestNow()]);
  const [l, session] = await Promise.all([getList(id), getSession()]);
  const isOwner = session?.user.id === l?.userId;
  if (!l || (!l.isPublic && !isOwner)) notFound();

  return (
    <>
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Lista {!l.isPublic && <span className="inline-flex items-center gap-1 normal-case tracking-normal text-subtle"><Lock className="size-3" /> privada</span>}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-balance md:text-4xl">{l.title}</h1>
          {l.description && <p className="mt-3 whitespace-pre-line text-fg/80">{l.description}</p>}
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Link href={`/u/${l.owner.username}`} className="flex items-center gap-2 font-medium text-fg hover:text-accent">
              <Avatar user={l.owner} size={24} /> {l.owner.name}
            </Link>
            · {l.items.length} {l.items.length === 1 ? "título" : "títulos"} · actualizada {timeAgo(l.updatedAt, now)}
          </p>
        </div>
        <div className="flex gap-2">
          {l.isPublic && <ShareButton path={`/listas/${l.id}`} />}
          {isOwner && (
            <ListEditor id={l.id} username={l.owner.username} initial={{ title: l.title, description: l.description ?? "", isPublic: l.isPublic }} />
          )}
        </div>
      </header>

      {l.items.length ? (
        <div className={GRID}>
          {l.items.map((it, i) => {
            const media: MediaSummary = {
              id: it.tmdbId, media_type: it.mediaType, title: it.title, original_title: it.title, overview: "",
              poster_path: it.posterPath, backdrop_path: null, vote_average: 0, vote_count: 0, popularity: 0,
              date: it.releaseDate, genre_ids: [], original_language: "",
            };
            return (
              <div key={`${it.mediaType}-${it.tmdbId}`} className="group/item relative">
                {isOwner && <RemoveItemButton listId={l.id} mediaType={it.mediaType} tmdbId={it.tmdbId} />}
                <MediaCard media={media} showType badge={<span className="tabular-nums text-white/80">#{i + 1}</span>} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
          {isOwner ? "Añade títulos desde su ficha con el botón «Añadir a lista»." : "Esta lista está vacía."}
        </p>
      )}
    </>
  );
}
