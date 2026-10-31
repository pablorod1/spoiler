import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Pencil, Star } from "lucide-react";
import { Avatar } from "@/components/social/avatar";
import { FollowButton } from "@/components/social/follow-button";
import { ActivityItem } from "@/components/social/activity-item";
import { ReviewCard } from "@/components/social/review-card";
import { ListCard } from "@/components/social/list-card";
import { MediaCard } from "@/components/media/media-card";
import { GRID } from "@/components/explore/infinite-grid";
import { getSession } from "@/lib/session";
import { requestNow } from "@/lib/now";
import {
  getFollowList,
  getProfileByUsername,
  getProfileStats,
  getUserActivity,
  getUserLists,
  getUserShelf,
  isFollowing,
} from "@/lib/social/queries";
import { stars } from "@/lib/library/types";
import { cn } from "@/lib/cn";
import type { MediaSummary } from "@/lib/tmdb/types";

const TABS = [
  { key: "actividad", label: "Actividad" },
  { key: "valoradas", label: "Valoradas" },
  { key: "resenas", label: "Reseñas" },
  { key: "favoritas", label: "Favoritas" },
  { key: "listas", label: "Listas" },
] as const;
type Tab = (typeof TABS)[number]["key"] | "seguidores" | "siguiendo";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const p = await getProfileByUsername(decodeURIComponent(username));
  if (!p) return { title: "Perfil no encontrado" };
  return { title: `${p.name} (@${p.username})`, description: p.bio ?? `Lo que ve y valora ${p.name} en Whatcher.` };
}

export default function Page(props: PageProps<"/u/[username]">) {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile {...props} />
      </Suspense>
    </main>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-5">
      <div className="skeleton size-24 rounded-full" />
      <div className="space-y-2">
        <div className="skeleton h-7 w-48 rounded" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
    </div>
  );
}

async function Profile({ params, searchParams }: PageProps<"/u/[username]">) {
  const [{ username }, sp, now] = await Promise.all([params, searchParams, requestNow()]);
  const p = await getProfileByUsername(decodeURIComponent(username));
  if (!p) notFound();

  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = (["seguidores", "siguiendo", ...TABS.map((t) => t.key)] as string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "actividad";

  const session = await getSession();
  const isMe = session?.user.id === p.userId;
  const [stats, following] = await Promise.all([
    getProfileStats(p.userId),
    session && !isMe ? isFollowing(session.user.id, p.userId) : Promise.resolve(false),
  ]);

  const tabHref = (t: Tab) => (t === "actividad" ? `/u/${p.username}` : `/u/${p.username}?tab=${t}`);
  const statItems: { label: string; value: React.ReactNode; href?: string }[] = [
    { label: "Películas", value: stats.movies },
    { label: "Series", value: stats.shows },
    { label: "Episodios", value: stats.episodes },
    {
      label: "Nota media",
      value: stats.avgRating ? (
        <span className="inline-flex items-center gap-1">
          {stars(stats.avgRating)} <Star className="size-3.5 fill-accent text-accent" />
        </span>
      ) : (
        "–"
      ),
      href: tabHref("valoradas"),
    },
    { label: "Seguidores", value: stats.followers, href: tabHref("seguidores") },
    { label: "Siguiendo", value: stats.following, href: tabHref("siguiendo") },
  ];

  return (
    <>
      <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-center">
        <Avatar user={p} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{p.name}</h1>
          <p className="mt-0.5 text-muted">@{p.username}</p>
          {p.bio && <p className="mt-3 max-w-2xl whitespace-pre-line text-fg/85">{p.bio}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
            <CalendarDays className="size-3.5" />
            En Whatcher desde {new Date(p.createdAt).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div>
          {isMe ? (
            <Link href="/ajustes" className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-2">
              <Pencil className="size-4" /> Editar perfil
            </Link>
          ) : (
            <FollowButton userId={p.userId} initial={following} loginHref={session ? undefined : `/entrar?volver=/u/${p.username}`} />
          )}
        </div>
      </header>

      <dl className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-6">
        {statItems.map((s) => {
          const inner = (
            <>
              <dd className="text-xl font-bold tabular-nums">{s.value}</dd>
              <dt className="text-xs text-subtle">{s.label}</dt>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="flex flex-col-reverse items-center gap-0.5 bg-surface px-3 py-4 transition hover:bg-surface-2">
              {inner}
            </Link>
          ) : (
            <div key={s.label} className="flex flex-col-reverse items-center gap-0.5 bg-surface px-3 py-4">
              {inner}
            </div>
          );
        })}
      </dl>

      <nav className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 pb-3 text-sm font-medium transition",
              tab === t.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <TabContent tab={tab} userId={p.userId} isMe={isMe} name={p.name} now={now} />
    </>
  );
}

async function TabContent({ tab, userId, isMe, name, now }: { tab: Tab; userId: string; isMe: boolean; name: string; now: number }) {
  if (tab === "actividad") {
    const items = await getUserActivity(userId, 40);
    if (!items.length) return <Empty text={isMe ? "Cuando veas, valores o guardes títulos aparecerá aquí." : `${name} aún no tiene actividad.`} />;
    return (
      <ul className="max-w-3xl divide-y divide-line">
        {items.map((a) => (
          <ActivityItem key={a.id} a={a} now={now} showUser={false} />
        ))}
      </ul>
    );
  }

  if (tab === "seguidores" || tab === "siguiendo") {
    const people = await getFollowList(userId, tab === "seguidores" ? "followers" : "following");
    if (!people.length) return <Empty text={tab === "seguidores" ? "Todavía no tiene seguidores." : "Todavía no sigue a nadie."} />;
    return (
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((u) => (
          <li key={u.userId}>
            <Link href={`/u/${u.username}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface/50 p-3 hover:border-line-strong">
              <Avatar user={u} size={40} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{u.name}</span>
                <span className="block truncate text-xs text-subtle">@{u.username}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (tab === "listas") {
    const lists = await getUserLists(userId, isMe);
    if (!lists.length) return <Empty text={isMe ? "Crea listas desde la ficha de cualquier película o serie." : `${name} aún no tiene listas públicas.`} />;
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lists.map((l) => (
          <ListCard key={l.id} l={l} />
        ))}
      </div>
    );
  }

  const rows = await getUserShelf(userId, tab);
  if (!rows.length) return <Empty text="Nada por aquí todavía." />;

  if (tab === "resenas") {
    return (
      <div className="max-w-3xl space-y-3">
        {rows.map((r) => (
          <ReviewCard
            key={`${r.mediaType}-${r.tmdbId}`}
            review={r.review!}
            spoiler={r.reviewSpoiler}
            rating={r.rating}
            date={r.reviewedAt}
            now={now}
            media={{ id: r.tmdbId, media_type: r.mediaType, title: r.title, poster_path: r.posterPath }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID}>
      {rows.map((r) => {
        const media: MediaSummary = {
          id: r.tmdbId, media_type: r.mediaType, title: r.title, original_title: r.title, overview: "",
          poster_path: r.posterPath, backdrop_path: r.backdropPath, vote_average: 0, vote_count: 0,
          popularity: 0, date: r.releaseDate, genre_ids: [], original_language: "",
        };
        return (
          <MediaCard
            key={`${r.mediaType}-${r.tmdbId}`}
            media={media}
            showType
            badge={r.rating ? <span className="inline-flex items-center gap-1 text-accent"><Star className="size-3 fill-current" /> {stars(r.rating)}</span> : undefined}
          />
        );
      })}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">{text}</p>;
}
