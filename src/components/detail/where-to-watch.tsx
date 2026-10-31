import Link from "next/link";
import Image from "next/image";
import { CircleCheck, MonitorPlay, Settings2 } from "lucide-react";
import { getMyProviderIds } from "@/lib/prefs/server";
import { cn } from "@/lib/cn";
import type { Provider, WatchAvailability } from "@/lib/tmdb/types";

const GROUPS = [
  { key: "flatrate", label: "Suscripción" },
  { key: "free", label: "Gratis" },
  { key: "ads", label: "Gratis con anuncios" },
  { key: "rent", label: "Alquiler" },
  { key: "buy", label: "Compra" },
] as const;

/** Reads the user's platforms from cookies: render inside <Suspense>. */
export async function WhereToWatch({
  availability,
  title,
}: {
  availability: WatchAvailability | null;
  title: string;
}) {
  const mine = new Set(await getMyProviderIds());
  const groups = GROUPS.map((g) => ({
    ...g,
    providers: [...(availability?.[g.key] ?? [])].sort(
      (a, b) =>
        Number(mine.has(b.provider_id)) - Number(mine.has(a.provider_id)) ||
        a.display_priority - b.display_priority,
    ),
  })).filter((g) => g.providers.length);

  const included = [...(availability?.flatrate ?? []), ...(availability?.free ?? []), ...(availability?.ads ?? [])].filter(
    (p) => mine.has(p.provider_id),
  );

  return (
    <section aria-labelledby="where-title" className="rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-xl md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="where-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <MonitorPlay className="size-5 text-accent" />
          Dónde ver
        </h2>
        <Link href="/mis-plataformas" className="inline-flex items-center gap-1 text-xs text-subtle hover:text-fg">
          <Settings2 className="size-3.5" />
          {mine.size ? "Mis plataformas" : "Elegir mis plataformas"}
        </Link>
      </div>

      {included.length > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-good/30 bg-good/10 p-3 text-sm">
          <CircleCheck className="size-5 shrink-0 text-good" />
          <p>
            <span className="font-semibold text-good">Ya la tienes incluida</span> en{" "}
            {included.map((p) => p.provider_name).join(", ")}.
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          Ahora mismo <strong className="text-fg">{title}</strong> no está disponible en ninguna plataforma en España.
          Puede que esté en cines o llegue más adelante.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">{g.label}</h3>
              <ul className="flex flex-wrap gap-2">
                {g.providers.map((p) => (
                  <ProviderTile key={p.provider_id} provider={p} mine={mine.has(p.provider_id)} href={availability?.link} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="mt-5 text-[11px] text-subtle">
        Disponibilidad en España por{" "}
        <a href="https://www.justwatch.com/es" target="_blank" rel="noreferrer" className="underline hover:text-fg">
          JustWatch
        </a>
        . Puede variar.
      </p>
    </section>
  );
}

function ProviderTile({ provider, mine, href }: { provider: Provider; mine: boolean; href?: string }) {
  const content = (
    <>
      <Image
        src={provider.logo_path}
        alt=""
        width={36}
        height={36}
        sizes="36px"
        className="rounded-lg"
      />
      <span className="pr-1 text-sm font-medium">{provider.provider_name}</span>
      {mine && <CircleCheck className="size-4 text-good" aria-label="En tus plataformas" />}
    </>
  );
  const cls = cn(
    "flex items-center gap-2.5 rounded-xl border p-1.5 pr-3 transition",
    mine ? "border-good/40 bg-good/5 hover:bg-good/10" : "border-line bg-surface-2 hover:border-line-strong",
  );
  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
          {content}
        </a>
      ) : (
        <span className={cls}>{content}</span>
      )}
    </li>
  );
}
