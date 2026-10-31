import { Suspense } from "react";
import type { Metadata } from "next";
import { search } from "@/lib/tmdb/api";
import { MediaCard } from "@/components/media/media-card";
import { PersonCard } from "@/components/media/person-card";
import { GridSkeleton } from "@/components/ui/skeletons";
import { GRID } from "@/components/explore/infinite-grid";
import { SearchBox } from "@/components/search/search-box";

export const metadata: Metadata = { title: "Buscar", robots: { index: false } };

export default function Page({ searchParams }: PageProps<"/buscar">) {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/buscar">, "searchParams">) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 100) ?? "";
  const [p1, p2] = q ? await Promise.all([search(q, 1), search(q, 2)]) : [null, null];
  const media = [...(p1?.media ?? []), ...(p2?.media ?? [])];
  const people = [...(p1?.people ?? []), ...(p2?.people ?? [])].filter((p) => p.profile_path);

  return (
    <>
      <SearchBox initial={q} />
      {q && (
        <p className="mb-6 mt-4 text-sm text-subtle">
          {media.length + people.length} resultados para <span className="text-fg">“{q}”</span>
        </p>
      )}
      {people.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Personas</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {people.slice(0, 8).map((p) => (
              <PersonCard key={p.id} person={p} role={p.known_for[0]?.title} />
            ))}
          </div>
        </section>
      )}
      {media.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Películas y series</h2>
          <div className={GRID}>
            {media.map((m) => (
              <MediaCard key={`${m.media_type}-${m.id}`} media={m} showType />
            ))}
          </div>
        </section>
      )}
      {q && !media.length && !people.length && (
        <p className="py-20 text-center text-muted">No hemos encontrado nada. Prueba con otro título o con el título original.</p>
      )}
    </>
  );
}
