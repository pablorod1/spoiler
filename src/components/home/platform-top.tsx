"use client";

import { Children, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleCheck, Info, TrendingUp } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { GenericTop } from "./platform-top-generic";
import { mediaHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PlatformTop } from "@/lib/tmdb/platform-top";
import type { Provider } from "@/lib/tmdb/types";

type Tab = "tv" | "movie";
type P = Pick<Provider, "provider_id" | "provider_name" | "logo_path">;
interface Props {
  provider: P;
  theme: { color: string; tint: string };
  top: PlatformTop;
}

/** Each platform gets a Top 10 row inspired by its own app; others use the generic hero. */
export function PlatformTopSection(props: Props) {
  if (!props.top.tv.length && !props.top.movie.length) return null;
  switch (props.provider.provider_id) {
    case 8:
    case 1796:
      return <NetflixTop {...props} />;
    case 119:
      return <PrimeTop {...props} />;
    case 1899:
      return <MaxTop {...props} />;
    case 337:
      return <DisneyTop {...props} />;
    default:
      return <GenericTop {...props} />;
  }
}

/* ------------------------------------------------------------- shared */

function useTab(top: PlatformTop) {
  return useState<Tab>(top.tv.length >= 5 || !top.movie.length ? "tv" : "movie");
}

function TypeTabs({
  top,
  tab,
  onChange,
  className,
  activeStyle,
}: {
  top: PlatformTop;
  tab: Tab;
  onChange: (t: Tab) => void;
  className?: string;
  activeStyle: React.CSSProperties;
}) {
  return (
    <div className={cn("flex rounded-full p-1", className)} role="tablist" aria-label="Tipo">
      {(["tv", "movie"] as const).map((t) =>
        top[t].length ? (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => onChange(t)}
            className={cn("h-8 rounded-full px-4 text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-white", tab !== t && "text-white/60 hover:text-white")}
            style={tab === t ? activeStyle : undefined}
          >
            {t === "tv" ? "Series" : "Películas"}
          </button>
        ) : null,
      )}
    </div>
  );
}

/** Horizontal scroller with arrows; padding keeps focus rings and overhangs visible. */
function Scroller({ children, className, gap = "gap-2" }: { children: React.ReactNode; className?: string; gap?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(update, [children]);
  const by = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="group/scroller relative">
      <div ref={ref} onScroll={update} className={cn("no-scrollbar flex snap-x overflow-x-auto overscroll-x-contain py-3", gap, className)}>
        {Children.map(children, (c) => (
          <div className="shrink-0 snap-start">{c}</div>
        ))}
      </div>
      {[-1, 1].map((d) => (
        <button
          key={d}
          type="button"
          aria-label={d < 0 ? "Anterior" : "Siguiente"}
          onClick={() => by(d)}
          disabled={d < 0 ? edges.start : edges.end}
          className={cn(
            "absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur transition group-hover/scroller:opacity-100 focus-visible:opacity-100 disabled:!opacity-0 md:grid",
            d < 0 ? "left-2" : "right-2",
          )}
        >
          {d < 0 ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
        </button>
      ))}
    </div>
  );
}

const trendingNote = (name: string) => `Tendencias de la semana disponibles en ${name}. La plataforma no publica un ranking oficial.`;

function weekLabel(end?: string) {
  if (!end) return "esta semana";
  const e = new Date(end + "T00:00:00");
  const s = new Date(e.getTime() - 6 * 86400000);
  const f = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" });
  return `del ${s.getMonth() === e.getMonth() ? s.getDate() : f.format(s)} al ${f.format(e)}`;
}

/* ------------------------------------------------------------- Netflix */

/** Giant outlined numbers with the poster overlapping their right half. */
function NetflixTop({ provider, top }: Props) {
  const [tab, setTab] = useTab(top);
  const items = top[tab];
  const official = top.source === "official";
  return (
    <section className="my-6 bg-[#141414] py-8 md:my-10 md:py-10" aria-label={`Top 10 en ${provider.provider_name}`}>
      <div className="container-page">
        <header className="mb-1 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src={provider.logo_path} alt="" width={40} height={40} sizes="40px" className="size-10 rounded-lg" />
            <div>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                Top 10 {tab === "tv" ? "series" : "películas"} en España {official ? "esta semana" : "en tendencia"}
              </h2>
              <p className="text-xs text-white/50">
                {official ? `Ranking oficial de Netflix · semana ${weekLabel(top.week)}` : trendingNote(provider.provider_name)}
              </p>
            </div>
          </div>
          <TypeTabs top={top} tab={tab} onChange={setTab} className="bg-white/10" activeStyle={{ background: "#e50914", color: "#fff" }} />
        </header>
      </div>
      <Scroller className="scroll-px-4 px-4 md:scroll-px-8 md:px-8 xl:scroll-px-12 xl:px-12" gap="gap-1">
        {items.map((it) => (
          <Link
            key={`${tab}-${it.id}`}
            href={mediaHref(it)}
            className="group relative flex h-[190px] items-end outline-none md:h-[240px]"
            aria-label={`${it.rank}. ${it.title}`}
          >
            <span
              className="select-none text-[190px] font-black leading-[0.78] tracking-[-0.08em] md:text-[240px]"
              style={{ color: "#141414", WebkitTextStroke: "4px #595959" }}
              aria-hidden
            >
              {it.rank}
            </span>
            <span className="relative -ml-8 block aspect-[2/3] h-[150px] overflow-hidden rounded-sm shadow-[0_8px_24px_rgb(0_0_0/0.7)] transition duration-300 group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-white md:-ml-10 md:h-[195px]">
              <Image src={it.poster_path!} alt="" fill sizes="130px" className="object-cover" />
              {official && it.weeksInTop === 1 && (
                <span className="absolute inset-x-1 bottom-1.5 rounded-sm bg-[#e50914] py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">Nuevo</span>
              )}
            </span>
          </Link>
        ))}
      </Scroller>
    </section>
  );
}

/* --------------------------------------------------------- Prime Video */

/** Hero with the selected title + landscape cards with large numbers behind them. */
function PrimeTop({ provider, top }: Props) {
  const [tab, setTab] = useTab(top);
  const [index, setIndex] = useState(0);
  const items = top[tab];
  const current = items[Math.min(index, items.length - 1)];
  const blue = "#1aa3ff";
  return (
    <section className="relative isolate my-6 overflow-hidden bg-[#0f171e] md:my-10" aria-label={`Top 10 en tendencia en ${provider.provider_name}`}>
      <div className="absolute inset-0 -z-10">
        {current?.backdrop_path && (
          <Image key={current.id} src={current.backdrop_path} alt="" fill sizes="100vw" className="animate-[fade-up_0.8s_ease-out] object-cover object-[center_20%] md:left-[30%] md:w-[70%]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f171e] via-[#0f171e]/85 to-transparent md:via-[#0f171e]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f171e] via-[#0f171e]/30 to-transparent" />
      </div>

      <div className="container-page flex min-h-[58svh] flex-col justify-end pb-4 pt-16 md:min-h-[62svh]">
        {current && (
          <div key={`${tab}-${current.id}`} className="mb-10 max-w-xl animate-fade-up">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: blue }}>
              #{current.rank} en tendencia en España <TrendingUp className="size-4" />
            </p>
            {current.logo ? (
              <h3 className="mb-4">
                <span className="sr-only">{current.title}</span>
                <Image src={current.logo.file_path} alt="" width={500} height={Math.round(500 / current.logo.aspect_ratio)} sizes="400px" className="h-auto max-h-24 w-auto max-w-[min(420px,80vw)] object-contain object-left md:max-h-28" />
              </h3>
            ) : (
              <h3 className="mb-3 text-3xl font-black uppercase tracking-[0.06em] md:text-5xl">{current.title}</h3>
            )}
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
              {current.vote_count >= 20 && <Rating value={current.vote_average} votes={current.vote_count} className="text-sm" />}
              {current.date && <span>{year(current.date)}</span>}
              {current.genres.length > 0 && <span>{current.genres.join(" • ")}</span>}
            </div>
            <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/80 md:text-base">{current.overview}</p>
            <p className="mb-6 flex items-center gap-2 text-sm font-semibold">
              <CircleCheck className="size-4" style={{ color: blue }} /> Incluido con {provider.provider_name}
            </p>
            <Link href={mediaHref(current)} className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90">
              <Info className="size-4" /> Dónde verla
            </Link>
          </div>
        )}

        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-base font-bold">
            <span style={{ color: blue }}>Prime</span> Top 10 en tendencia en España <TrendingUp className="size-4" style={{ color: blue }} />
          </p>
          <TypeTabs top={top} tab={tab} onChange={(t) => (setTab(t), setIndex(0))} className="bg-white/10" activeStyle={{ background: blue, color: "#fff" }} />
        </div>
        <p className="text-xs text-white/40">{trendingNote(provider.provider_name)}</p>
      </div>

      <Scroller className="scroll-px-4 px-4 pb-8 md:scroll-px-8 md:px-8 xl:scroll-px-12 xl:px-12" gap="gap-3">
        {items.map((it, i) => {
          const on = it === current;
          return (
            <button
              key={`${tab}-${it.id}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={on}
              aria-label={`${it.rank}. ${it.title}`}
              className="group relative flex items-end outline-none"
            >
              <span className="select-none text-[110px] font-black leading-[0.75] tracking-[-0.06em] text-[#d6dde3] md:text-[140px]" aria-hidden>
                {it.rank}
              </span>
              <span
                className={cn(
                  "relative -ml-6 block aspect-video w-[230px] overflow-hidden rounded-md shadow-[0_10px_30px_rgb(0_0_0/0.6)] transition duration-300 md:-ml-8 md:w-[280px]",
                  on ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f171e]" : "group-hover:scale-[1.03] group-focus-visible:ring-2 group-focus-visible:ring-white",
                )}
              >
                <Image src={it.backdrop_path!} alt="" fill sizes="280px" className="object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 truncate px-3 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                  {it.rank === 1 ? `#1 en ${provider.provider_name}` : it.title}
                </span>
              </span>
            </button>
          );
        })}
      </Scroller>
    </section>
  );
}

/* ------------------------------------------------------------- HBO Max */

const MAX_VIOLET = "#7b7bff";

/** Huge outlined "TOP 10" heading and tall posters with outlined numbers. */
function MaxTop({ provider, top }: Props) {
  const [tab, setTab] = useTab(top);
  const items = top[tab];
  return (
    <section
      className="my-6 py-10 md:my-10 md:py-14"
      style={{ background: "radial-gradient(120% 80% at 0% 0%, #1c1446 0%, #05050c 55%)" }}
      aria-label={`Top 10 en tendencia en ${provider.provider_name}`}
    >
      <div className="container-page">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-center gap-5 md:gap-8">
            <h2
              className="select-none whitespace-nowrap text-[56px] font-black leading-[0.8] tracking-[-0.04em] sm:text-[80px] md:text-[150px]"
              style={{ color: "transparent", WebkitTextStroke: `2px ${MAX_VIOLET}` }}
            >
              <span className="sr-only">Top 10 en {provider.provider_name}</span>
              <span aria-hidden>TOP 10</span>
            </h2>
            <div className="whitespace-nowrap text-[11px] font-medium uppercase leading-snug tracking-[0.3em] text-white sm:text-sm md:text-xl md:tracking-[0.35em]">
              <p>{tab === "tv" ? "Series" : "Películas"}</p>
              <p>en tendencia</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex items-center gap-2">
              <Image src={provider.logo_path} alt="" width={32} height={32} sizes="32px" className="size-8 rounded-md" />
              <TypeTabs top={top} tab={tab} onChange={setTab} className="border border-white/15" activeStyle={{ background: MAX_VIOLET, color: "#05050c" }} />
            </div>
            <p className="max-w-xs text-[11px] text-white/40 md:text-right">{trendingNote(provider.provider_name)}</p>
          </div>
        </header>
      </div>
      <Scroller className="scroll-px-4 px-4 md:scroll-px-8 md:px-8 xl:scroll-px-12 xl:px-12" gap="gap-4 md:gap-6">
        {items.map((it) => (
          <Link key={`${tab}-${it.id}`} href={mediaHref(it)} className="group flex items-end gap-1 outline-none" aria-label={`${it.rank}. ${it.title}`}>
            <span
              className="mb-1 select-none text-[110px] font-light leading-[0.75] md:text-[150px]"
              style={{ color: "transparent", WebkitTextStroke: `2px ${MAX_VIOLET}` }}
              aria-hidden
            >
              {it.rank}
            </span>
            <span className="relative block aspect-[2/3] w-[170px] overflow-hidden rounded-sm transition duration-300 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-white md:w-[230px]">
              <Image src={it.poster_path!} alt="" fill sizes="230px" className="object-cover" />
            </span>
          </Link>
        ))}
      </Scroller>
    </section>
  );
}

/* -------------------------------------------------------------- Disney+ */

const DISNEY_CYAN = "#23d3e6";

/** Tall artwork cards: rank in a curved corner, logo + rating + year at the bottom. */
function DisneyTop({ provider, top }: Props) {
  const [tab, setTab] = useTab(top);
  const items = top[tab];
  return (
    <section
      className="my-6 py-10 md:my-10 md:py-12"
      style={{ background: "linear-gradient(180deg, #1a1d29 0%, #0e1018 100%)" }}
      aria-label={`Top 10 en tendencia en ${provider.provider_name}`}
    >
      <div className="container-page">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src={provider.logo_path} alt="" width={40} height={40} sizes="40px" className="size-10 rounded-lg" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white/90 md:text-2xl">Top 10 en tendencia en España</h2>
              <p className="text-xs text-white/45">{trendingNote(provider.provider_name)}</p>
            </div>
          </div>
          <TypeTabs top={top} tab={tab} onChange={setTab} className="bg-white/10" activeStyle={{ background: "#fff", color: "#0e1018" }} />
        </header>
      </div>
      <Scroller className="scroll-px-4 px-4 md:scroll-px-8 md:px-8 xl:scroll-px-12 xl:px-12" gap="gap-4">
        {items.map((it) => (
          <Link
            key={`${tab}-${it.id}`}
            href={mediaHref(it)}
            aria-label={`${it.rank}. ${it.title}`}
            className="group relative block aspect-[3/4.4] w-[220px] overflow-hidden rounded-xl bg-[#0e1018] ring-1 ring-white/10 outline-none transition duration-300 hover:scale-[1.03] hover:ring-white/60 focus-visible:ring-2 focus-visible:ring-white md:w-[260px]"
          >
            <Image src={it.backdrop_path!} alt="" fill sizes="260px" className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#0e1018] via-[#0e1018]/40 to-transparent" />
            {/* curved corner with the rank */}
            <span className="absolute -left-10 -top-10 size-28 rounded-full bg-[#0e1018]/90" aria-hidden />
            <span className="absolute left-4 top-2.5 text-5xl font-bold" style={{ color: DISNEY_CYAN }} aria-hidden>
              {it.rank}
            </span>
            <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-4 text-center">
              {it.logo ? (
                <Image src={it.logo.file_path} alt="" width={300} height={Math.round(300 / it.logo.aspect_ratio)} sizes="200px" className="h-auto max-h-16 w-auto max-w-[85%] object-contain drop-shadow-[0_2px_10px_rgb(0_0_0/0.7)]" />
              ) : (
                <span className="line-clamp-2 text-lg font-bold">{it.title}</span>
              )}
              <span className="flex items-center gap-2 text-xs text-white/75">
                {it.vote_count >= 20 && <Rating value={it.vote_average} votes={it.vote_count} />}
                {it.date && <span>{year(it.date)}</span>}
              </span>
            </span>
          </Link>
        ))}
      </Scroller>
    </section>
  );
}

