import { Suspense, cache } from "react";
import Link from "next/link";
import { Flame, Clapperboard, CalendarClock, Tv, Trophy, Sparkles, MonitorPlay, ArrowRight, PlayCircle, BookmarkCheck } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { TrailerCarousel } from "@/components/home/trailer-carousel";
import { PlatformSpotlight } from "@/components/home/platform-spotlight";
import { BentoSection, LandscapeCard, TimelineCard } from "@/components/home/sections";
import { providerTheme } from "@/lib/tmdb/provider-theme";
import { Rail } from "@/components/media/rail";
import { MediaCard } from "@/components/media/media-card";
import { ProviderLogo } from "@/components/ui/provider-logo";
import { RailSkeleton } from "@/components/ui/skeletons";
import { discover, getGenres, getHeroItems, getList, getProviders, getTrending, getUpcomingMovies, getFeaturedTrailers, getPlatformSpotlight } from "@/lib/tmdb/api";
import { getMyProviderIds } from "@/lib/prefs/server";
import { DEFAULT_PROVIDER_IDS } from "@/lib/prefs/constants";
import { getSession } from "@/lib/session";
import { getContinueWatching, getWatchlistOnMyPlatforms } from "@/lib/library/queries";
import { ProgressCard } from "@/components/library/progress-card";
import type { MediaSummary, Provider } from "@/lib/tmdb/types";

export default function HomePage() {
  return (
    <main>
      <Suspense fallback={<div className="skeleton h-[78svh] min-h-[520px] md:h-[88svh]" />}>
        <HeroSection />
      </Suspense>

      <div className="relative z-10 -mt-10 md:-mt-16">
        <Suspense fallback={<RailSkeleton />}>
          <TrendingRail />
        </Suspense>

        <Suspense fallback={<div className="container-page py-12"><div className="skeleton h-[78svh] rounded-3xl md:h-[86svh]" /></div>}>
          <TrailersSection />
        </Suspense>

        <Suspense fallback={null}>
          <PersonalRails />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <PlatformIntro />
        </Suspense>

        <Suspense fallback={<SpotlightSkeleton />}>
          <SpotlightSlot slot={0} />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <CinemaBento />
        </Suspense>

        <Suspense fallback={<SpotlightSkeleton />}>
          <SpotlightSlot slot={1} />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <UpcomingRail />
        </Suspense>

        <Suspense fallback={<SpotlightSkeleton />}>
          <SpotlightSlot slot={2} />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <SeriesLandscape />
        </Suspense>
        <Suspense fallback={<RailSkeleton />}>
          <ListRail type="movie" list="top_rated" title="Imprescindibles de siempre" icon={<Trophy className="size-5 text-accent" />} />
        </Suspense>
      </div>
    </main>
  );
}

async function HeroSection() {
  const [items, movieGenres, tvGenres] = await Promise.all([
    getHeroItems(6),
    getGenres("movie"),
    getGenres("tv"),
  ]);
  const genreNames = Object.fromEntries([...movieGenres, ...tvGenres].map((g) => [g.id, g.name]));
  return <Hero items={items} genreNames={genreNames} />;
}

async function TrailersSection() {
  const items = await getFeaturedTrailers(7);
  return <TrailerCarousel items={items} />;
}

async function TrendingRail() {
  const items = (await getTrending("all", "day")).slice(0, 10);
  return (
    <Rail
      title="Top 10 de hoy"
      icon={<Flame className="size-5 text-accent" />}
      itemClassName="w-[46%] sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%] pl-7"
    >
      {items.map((m, i) => (
        <MediaCard key={`${m.media_type}-${m.id}`} media={m} rank={i + 1} showType />
      ))}
    </Rail>
  );
}

async function ListRail({
  type,
  list,
  title,
  icon,
  href,
}: {
  type: "movie" | "tv";
  list: "now_playing" | "on_the_air" | "top_rated" | "popular";
  title: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const { results } = await getList(type, list);
  return (
    <Rail title={title} icon={icon} href={href}>
      {results.map((m) => (
        <MediaCard key={m.id} media={m} />
      ))}
    </Rail>
  );
}

async function UpcomingRail() {
  const upcoming = await getUpcomingMovies();
  return (
    <Rail eyebrow="Calendario" title="Próximos estrenos en cines" icon={<CalendarClock className="size-5 text-accent" />}>
      {upcoming.map((m, i) => (
        <TimelineCard key={m.id} media={m} showDate={i === 0 || upcoming[i - 1].date !== m.date} />
      ))}
    </Rail>
  );
}

/* ------------------------------------------------- signed-in user rails */

async function PersonalRails() {
  const session = await getSession();
  if (!session) return null;
  const userId = session.user.id;
  const [progress, providerIds] = await Promise.all([getContinueWatching(userId), getMyProviderIds()]);
  const available = await getWatchlistOnMyPlatforms(userId, providerIds);
  const pending = progress.filter((p) => p.next).concat(progress.filter((p) => !p.next));

  return (
    <>
      {pending.length > 0 && (
        <Rail
          title="Continúa viendo"
          icon={<PlayCircle className="size-5 text-accent" />}
          href="/mi-lista?vista=viendo"
          itemClassName="w-[80%] sm:w-[45%] md:w-[33%] lg:w-[25%] xl:w-[22%]"
        >
          {pending.map((p) => (
            <ProgressCard key={p.show.id} p={p} />
          ))}
        </Rail>
      )}
      {available.length > 0 && (
        <Rail title="De tu lista, ya en tus plataformas" icon={<BookmarkCheck className="size-5 text-accent" />} href="/mi-lista">
          {available.map(({ media, providers }) => (
            <MediaCard
              key={`${media.media_type}-${media.id}`}
              media={media}
              subtitle={`En ${providers.map((p) => p.provider_name).join(", ")}`}
              badge={
                <span className="flex items-center gap-1">
                  {providers.slice(0, 3).map((p) => (
                    <ProviderLogo key={p.provider_id} provider={p} size={16} className="rounded" />
                  ))}
                </span>
              }
            />
          ))}
        </Rail>
      )}
    </>
  );
}

/* ---------------------------------------------- personalised by platform */

/** Your platforms (or sensible defaults), resolved once per request. */
const resolvePlatforms = cache(async () => {
  const [mine, all] = await Promise.all([getMyProviderIds(), getProviders()]);
  const byId = new Map(all.map((p) => [p.provider_id, p]));
  const selected = (mine.length ? mine : DEFAULT_PROVIDER_IDS).map((id) => byId.get(id)).filter((p): p is Provider => !!p);
  return { mine, selected };
});

async function PlatformIntro() {
  const { mine, selected } = await resolvePlatforms();
  return mine.length ? <NewOnMyPlatforms providerIds={mine} providers={selected} /> : <PickPlatformsBanner providers={selected.slice(0, 8)} />;
}

/** The three showcases, de-duplicated so a title is only featured once. */
const resolveSpotlights = cache(async () => {
  const { selected } = await resolvePlatforms();
  const providers = selected.slice(0, 3);
  const lists = await Promise.all(providers.map((p) => getPlatformSpotlight(p.provider_id, 12)));
  const used = new Set<string>();
  return lists.map((items) =>
    items
      .filter((m) => {
        const k = `${m.media_type}-${m.id}`;
        if (used.has(k)) return false;
        used.add(k);
        return true;
      })
      .slice(0, 6),
  );
});

async function SpotlightSlot({ slot }: { slot: number }) {
  const { mine, selected } = await resolvePlatforms();
  const provider = selected[slot];
  if (!provider) return null;
  const items = (await resolveSpotlights())[slot] ?? [];
  return (
    <PlatformSpotlight
      provider={provider}
      theme={providerTheme(provider.provider_id)}
      items={items}
      eyebrow={mine.length ? "En tu plataforma" : "Lo más visto en"}
    />
  );
}

function SpotlightSkeleton() {
  return (
    <div className="container-page py-8 md:py-10">
      <div className="skeleton min-h-[560px] rounded-[2rem] md:h-[78svh] md:max-h-[820px]" />
    </div>
  );
}

async function CinemaBento() {
  const { results } = await getList("movie", "now_playing");
  return <BentoSection eyebrow="Cartelera" title="En cines ahora" icon={<Clapperboard className="size-5 text-accent" />} items={results} badge="En cines" />;
}

async function SeriesLandscape() {
  const { results } = await getList("tv", "on_the_air");
  return (
    <Rail
      title="Series en emisión"
      icon={<Tv className="size-5 text-accent" />}
      href="/series"
      itemClassName="w-[80%] sm:w-[45%] md:w-[32%] lg:w-[24%]"
    >
      {results.filter((m) => m.backdrop_path).map((m) => (
        <LandscapeCard key={m.id} media={m} />
      ))}
    </Rail>
  );
}

async function NewOnMyPlatforms({ providerIds, providers }: { providerIds: number[]; providers: Provider[] }) {
  const [movies, shows] = await Promise.all([
    discover({ type: "movie", providers: providerIds, sort: "newest", releasedOnly: true }),
    discover({ type: "tv", providers: providerIds, sort: "newest", releasedOnly: true }),
  ]);
  const items = interleave(
    movies.results.filter((m) => m.poster_path && m.vote_count >= 10),
    shows.results.filter((m) => m.poster_path && m.vote_count >= 5),
  );
  return (
    <Rail
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          {providers.slice(0, 6).map((p) => (
            <ProviderLogo key={p.provider_id} provider={p} size={16} className="rounded" />
          ))}
          <Link href="/mis-plataformas" className="ml-1 normal-case tracking-normal text-subtle hover:text-fg">
            Editar
          </Link>
        </span>
      }
      title="Novedades en tus plataformas"
      icon={<Sparkles className="size-5 text-accent" />}
    >
      {items.map((m) => (
        <MediaCard key={`${m.media_type}-${m.id}`} media={m} showType />
      ))}
    </Rail>
  );
}

function PickPlatformsBanner({ providers }: { providers: Provider[] }) {
  return (
    <section className="container-page py-6">
      <Link
        href="/mis-plataformas"
        className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface-2 via-surface to-surface p-6 transition hover:border-line-strong md:flex-row md:items-center md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <MonitorPlay className="size-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">¿Qué plataformas tienes?</h2>
          <p className="mt-1 text-sm text-muted">
            Márcalas una vez y Whatcher te enseñará primero lo que puedes ver sin pagar más.
          </p>
        </div>
        <div className="flex items-center -space-x-2">
          {providers.map((p) => (
            <ProviderLogo key={p.provider_id} provider={p} size={36} className="ring-2 ring-surface" />
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
          Elegir <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </Link>
    </section>
  );
}

function interleave(a: MediaSummary[], b: MediaSummary[]) {
  const out: MediaSummary[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}
