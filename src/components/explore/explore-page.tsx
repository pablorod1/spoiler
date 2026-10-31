import { Suspense } from "react";
import { ExploreShell } from "./filters";
import { InfiniteGrid } from "./infinite-grid";
import { GridSkeleton } from "@/components/ui/skeletons";
import { discover, getCurrentYear, getGenres, getProviders } from "@/lib/tmdb/api";
import { exploreToSearch, parseExplore, toDiscover } from "@/lib/explore";
import { getMyProviderIds } from "@/lib/prefs/server";
import { DEFAULT_PROVIDER_IDS } from "@/lib/prefs/constants";
import type { MediaType } from "@/lib/tmdb/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function ExplorePage({
  type,
  title,
  subtitle,
  searchParams,
}: {
  type: MediaType;
  title: string;
  subtitle: string;
  searchParams: SearchParams;
}) {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </header>
      <Suspense
        fallback={
          <>
            <div className="mb-8 space-y-3">
              <div className="skeleton h-12 w-full max-w-4xl rounded-2xl" />
              <div className="skeleton h-9 w-full max-w-2xl rounded-full" />
            </div>
            <GridSkeleton />
          </>
        }
      >
        <ExploreContent type={type} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ExploreContent({ type, searchParams }: { type: MediaType; searchParams: SearchParams }) {
  const [sp, mine, providers, genres, currentYear] = await Promise.all([
    searchParams,
    getMyProviderIds(),
    getProviders(),
    getGenres(type),
    getCurrentYear(),
  ]);
  const state = parseExplore(sp);
  if (state.mine && !mine.length) state.mine = false;

  // Chips: user's platforms first, then the most relevant in Spain
  const pinned = new Set([...mine, ...DEFAULT_PROVIDER_IDS, ...state.providers]);
  const chips = [
    ...providers.filter((p) => pinned.has(p.provider_id)),
    ...providers.filter((p) => !pinned.has(p.provider_id)),
  ].slice(0, Math.max(16, pinned.size));

  const basePath = type === "movie" ? "/peliculas" : "/series";
  const initial = await discover(toDiscover(type, state, mine));
  const qs = exploreToSearch(state);
  qs.set("tipo", type);

  return (
    <>
      <ExploreShell
        basePath={basePath}
        state={state}
        providers={chips}
        genres={genres}
        myProviderIds={mine}
        currentYear={currentYear}
        total={initial.total_results}
        noun={type === "movie" ? "películas" : "series"}
      >
        <InfiniteGrid key={qs.toString()} initial={initial} endpoint={`/api/discover?${qs}`} />
      </ExploreShell>
    </>
  );
}
