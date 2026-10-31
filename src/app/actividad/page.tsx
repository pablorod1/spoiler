import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { requestNow } from "@/lib/now";
import { getFeed, getFollowingIds, getGlobalActivity, getSuggestedUsers } from "@/lib/social/queries";
import { ActivityItem } from "@/components/social/activity-item";
import { Avatar } from "@/components/social/avatar";
import { FollowButton } from "@/components/social/follow-button";

export const metadata: Metadata = { title: "Actividad" };

export default function Page() {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <h1 className="mb-6 text-3xl font-black tracking-tight md:text-4xl">Actividad</h1>
      <Suspense fallback={<div className="skeleton h-96 max-w-3xl rounded-2xl" />}>
        <Feed />
      </Suspense>
    </main>
  );
}

async function Feed() {
  const [session, now] = await Promise.all([getSession(), requestNow()]);
  const me = session?.user.id ?? null;
  const followingCount = me ? (await getFollowingIds(me)).length : 0;
  const [items, suggestions] = await Promise.all([
    me && followingCount ? getFeed(me, 60) : getGlobalActivity(40, me ?? undefined),
    getSuggestedUsers(me, 6),
  ]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <section className="min-w-0">
        {!followingCount && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm">
            <Users className="size-5 shrink-0 text-accent" />
            <p>
              {me ? "Aún no sigues a nadie. " : ""}Esto es lo último que se está viendo en Whatcher.{" "}
              {me ? "Sigue a gente para tener tu propio feed." : <Link href="/entrar?volver=/actividad" className="font-semibold text-accent">Crea tu cuenta</Link>}
              {!me && " para seguir a gente y tener tu propio feed."}
            </p>
          </div>
        )}
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map((a) => (
              <ActivityItem key={a.id} a={a} now={now} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
            Todavía no hay actividad. ¡Sé el primero en valorar algo!
          </p>
        )}
      </section>

      {suggestions.length > 0 && (
        <aside>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-subtle">A quién seguir</h2>
          <ul className="space-y-2">
            {suggestions.map((u) => (
              <li key={u.userId} className="flex items-center gap-3 rounded-xl border border-line bg-surface/50 p-3">
                <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar user={u} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{u.name}</span>
                    <span className="block truncate text-xs text-subtle">@{u.username}</span>
                  </span>
                </Link>
                <FollowButton userId={u.userId} initial={false} size="sm" loginHref={me ? undefined : "/entrar?volver=/actividad"} />
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
