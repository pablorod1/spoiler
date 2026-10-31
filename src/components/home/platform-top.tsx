"use client";

import { Children, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleCheck, Info, TrendingUp } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { GenericTop } from "./platform-top-generic";
import { ROW_PAD } from "./row-pad";
import { DisneyPlusWordmark, HboMaxWordmark, NetflixWordmark, PrimeVideoWordmark } from "./brand-marks";
import { mediaHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PlatformTop, RankedItem } from "@/lib/tmdb/platform-top";
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

/** Title + note + type tabs sitting right above a Top 10 row; same spacing on every platform. */
function RowHeader({ title, note, children }: { title: React.ReactNode; note: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-1.5 text-base font-bold tracking-tight md:text-lg">{title}</h2>
        <p className="mt-0.5 text-xs text-white/50">{note}</p>
      </div>
      {children}
    </div>
  );
}

/** Horizontal scroller with arrows; padding keeps focus rings and overhangs visible. */
function Scroller({ children, className, gap = "gap-2", py = "py-3" }: { children: React.ReactNode; className?: string; gap?: string; py?: string }) {
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
      <div ref={ref} onScroll={update} className={cn("no-scrollbar flex snap-x overflow-x-auto overflow-y-hidden overscroll-x-contain", py, gap, className)}>
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

/**
 * Index of the title shown in a billboard, driven by hovering (mouse only, with a short delay)
 * or focusing a card. Pointer moves without movement are the browser re-hovering after a page
 * scroll, so they are ignored.
 */
function useHoverPreview() {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef(-1);
  useEffect(() => () => clearTimeout(timer.current), []);
  const cancel = () => {
    clearTimeout(timer.current);
    pending.current = -1;
  };
  const preview = (i: number, delay: number) => {
    if (pending.current === i) return;
    clearTimeout(timer.current);
    pending.current = i;
    timer.current = setTimeout(() => setIndex(i), delay);
  };
  const handlers = (i: number) => ({
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && (e.movementX || e.movementY)) preview(i, 160);
    },
    onPointerLeave: cancel,
    onFocus: () => preview(i, 0),
  });
  const reset = () => (cancel(), setIndex(0));
  return { index, handlers, reset };
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

const NF_RED = "#e50914";
const NF_BG = "#141414";

/**
 * Billboard with the full-size backdrop of the previewed title (hover or focus a card)
 * over a Top 10 row: outlined gradient numbers with the poster covering their right side.
 */
function NetflixTop({ provider, top }: Props) {
  const [tab, setTab] = useTab(top);
  const { index, handlers, reset } = useHoverPreview();
  const items = top[tab];
  const current = items[Math.min(index, items.length - 1)];
  const official = top.source === "official";
  const kind = tab === "tv" ? "series" : "películas";

  return (
    <section
      className="relative isolate my-6 flex h-[calc(100svh-4rem)] min-h-[560px] flex-col overflow-hidden md:my-10"
      style={{ background: NF_BG }}
      aria-label={`Top 10 en ${provider.provider_name}`}
    >
      <div className="absolute inset-0 -z-10" aria-hidden>
        {current?.backdrop_path && <CrossfadeBackdrop id={`${tab}-${current.id}`} src={current.backdrop_path} />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/75 to-transparent md:w-3/4 md:via-[#141414]/55" />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#141414] via-[#141414]/85 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#141414] to-transparent" />
      </div>

      <div className="container-page flex min-h-0 flex-1 flex-col pt-8 md:pt-10">
        <NetflixWordmark className="h-6 w-auto shrink-0 self-start text-[#e50914] drop-shadow-[0_2px_10px_rgb(0_0_0/0.5)] md:h-8" />
        {/* Sized by the free space (container query units), so the title never climbs into the wordmark */}
        <div className="relative min-h-0 flex-1 [container-type:size]">
          {current && (
            <div key={`${tab}-${current.id}`} className="absolute bottom-0 left-0 max-w-xl animate-fade-up pb-8 md:pb-10">
              {current.logo ? (
                <h3 className="mb-4">
                  <span className="sr-only">{current.title}</span>
                  <Image
                    src={current.logo.file_path}
                    alt=""
                    width={500}
                    height={Math.round(500 / current.logo.aspect_ratio)}
                    sizes="420px"
                    className="h-auto max-h-[clamp(2rem,calc(100cqh-19rem),8rem)] w-auto max-w-[min(420px,75vw)] object-contain object-left drop-shadow-[0_2px_12px_rgb(0_0_0/0.6)] [@container(max-height:23rem)]:max-h-[clamp(2rem,calc(100cqh-14rem),8rem)] [@container(max-height:17rem)]:max-h-[clamp(2rem,calc(100cqh-11.5rem),8rem)]"
                  />
                </h3>
              ) : (
                <h3 className="mb-3 line-clamp-2 text-3xl font-black tracking-tight md:text-5xl [@container(max-height:23rem)]:text-3xl">{current.title}</h3>
              )}
              <p className="mb-3 flex items-center gap-2.5 text-base font-semibold md:text-xl">
                <Top10Badge />
                Nº {current.rank} en {kind} {official ? "esta semana" : "en tendencia"}
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80 [@container(max-height:17rem)]:hidden">
                {current.vote_count >= 20 && <Rating value={current.vote_average} votes={current.vote_count} className="text-sm" />}
                {current.date && <span>{year(current.date)}</span>}
                {current.genres.length > 0 && <span>{current.genres.join(" · ")}</span>}
                {official && current.weeksInTop && current.weeksInTop > 1 && (
                  <span className="text-white/60">{current.weeksInTop} semanas en el Top 10</span>
                )}
              </div>
              <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-white/85 md:text-base [@container(max-height:23rem)]:hidden [@container(min-height:32rem)]:line-clamp-3">{current.overview}</p>
              <Link
                href={mediaHref(current)}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black transition hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:h-12 md:px-7 md:text-base"
              >
                <Info className="size-5" /> Dónde verla
              </Link>
            </div>
          )}
        </div>

        <RowHeader
          title={<>Top 10 {kind} en España {official ? "esta semana" : "en tendencia"}</>}
          note={official ? `Ranking oficial de Netflix · semana ${weekLabel(top.week)}` : trendingNote(provider.provider_name)}
        >
          <TypeTabs
            top={top}
            tab={tab}
            onChange={(t) => (reset(), setTab(t))}
            className="bg-black/50 backdrop-blur"
            activeStyle={{ background: NF_RED, color: "#fff" }}
          />
        </RowHeader>
      </div>

      <Scroller
        className={cn(ROW_PAD, "pb-6 [--h:clamp(120px,19svh,160px)] md:pb-8 md:[--h:clamp(140px,24svh,220px)]")}
        gap="gap-2 md:gap-3"
      >
        {items.map((it, i) => {
          const on = it === current;
          return (
            <Link
              key={`${tab}-${it.id}`}
              href={mediaHref(it)}
              {...handlers(i)}
              className="group relative flex h-(--h) items-end outline-none"
              aria-label={`${it.rank}. ${it.title}`}
            >
              <RankNumber rank={it.rank} variant="outline" bg={NF_BG} from={on ? "#ff4d57" : "#b3b3b3"} to={on ? NF_RED : "#3a3a3a"} />
              <span
                className={cn(
                  "relative -ml-[calc(var(--h)*0.22)] block aspect-[2/3] h-full overflow-hidden rounded-md bg-white/5 shadow-[0_10px_30px_rgb(0_0_0/0.65)] transition duration-300 ease-out-expo group-focus-visible:ring-2 group-focus-visible:ring-white",
                  on ? "ring-2 ring-white/90" : "group-hover:-translate-y-1",
                )}
              >
                <Image src={(it.poster_path ?? it.backdrop_path)!} alt="" fill sizes="160px" className="object-cover" />
                {official && it.weeksInTop === 1 && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-t-sm px-2 py-0.5 text-[10px] font-bold text-white md:text-xs" style={{ background: NF_RED }}>
                    Novedad
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </Scroller>
    </section>
  );
}

/** Left edge of each rank's ink in the 128×140 box (Geist 900 at 186px, measured with canvas). */
const INK_LEFT: Record<number, number> = { 1: 43, 2: 12.5, 3: 10, 4: 4.5, 5: 7.5, 6: 14.5, 7: 28, 8: 2.5, 9: 11.5, 10: 0.5 };

/**
 * Rank drawn in SVG so it sizes itself to the card height and can carry a gradient.
 * "outline": stroked digits filled with the background (Netflix). "solid": gradient-filled digits.
 */
function RankNumber({ rank, from, to, bg, variant }: { rank: number; from: string; to: string; bg: string; variant: "outline" | "solid" }) {
  const id = "rk" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const outline = variant === "outline";
  // Crop the box to the digit's ink (like Netflix) so narrow digits such as "1" or "7" don't leave
  // a gap on their left: the first card lines up with the text and spacing stays even.
  // The outline stroke sticks out 2.75 units past the ink; the solid variant's stroke is invisible.
  const x0 = (INK_LEFT[rank] ?? 0) - (outline ? 2.75 : 0);
  const glyph = {
    fontSize: 186,
    fontWeight: 900,
    fill: outline ? bg : `url(#${id})`,
    // Outline: the variable font builds digits from overlapping contours, so the stroke is painted
    // first and the opaque fill hides the inner seams (only the outer half shows).
    // Solid: a background-coloured stroke separates the overlapping digits of "10".
    stroke: outline ? `url(#${id})` : bg,
    strokeWidth: outline ? 5.5 : 7,
    strokeLinejoin: "round",
    paintOrder: "stroke",
  } as const;
  return (
    <svg viewBox={`${x0} 0 ${128 - x0} 140`} className="h-full w-auto shrink-0 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      {rank >= 10 ? (
        // "10" keeps the single-digit width: the digits overlap (the "0" in front, each with its
        // own edge) and most of the "0" runs on under the card.
        <>
          <text x="-6" y="139" {...glyph}>1</text>
          <text x="60" y="139" {...glyph}>0</text>
        </>
      ) : (
        <text x="128" y="139" textAnchor="end" {...glyph}>
          {rank}
        </text>
      )}
    </svg>
  );
}

function Top10Badge() {
  return (
    <span className="inline-flex size-7 shrink-0 flex-col items-center justify-center rounded-[3px] leading-none text-white md:size-8" style={{ background: NF_RED }} aria-hidden>
      <span className="text-[7px] font-bold tracking-[0.12em] md:text-[8px]">TOP</span>
      <span className="text-[13px] font-black tracking-tight md:text-[15px]">10</span>
    </span>
  );
}

/** Keeps the previous backdrop underneath while the next one loads, then fades it in. */
function CrossfadeBackdrop({ id, src }: { id: string; src: string }) {
  const [layers, setLayers] = useState([{ id, src }]);
  if (layers[layers.length - 1].id !== id) setLayers([...layers.slice(-1), { id, src }]);
  return layers.map((l) => <BackdropLayer key={l.id} src={l.src} />);
}

function BackdropLayer({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="100vw"
      onLoad={() => setLoaded(true)}
      className={cn(
        "object-cover object-[center_20%] transition-opacity duration-700 ease-out motion-safe:animate-[ken-burns_14s_ease-out_both]",
        loaded ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

/* --------------------------------------------------------- Prime Video */

const PRIME_BG = "#0f171e";

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

      <div className="container-page flex min-h-[58svh] flex-col justify-end pt-8 md:min-h-[62svh] md:pt-10">
        <PrimeVideoWordmark className="mb-auto h-7 w-auto self-start text-white drop-shadow-[0_2px_10px_rgb(0_0_0/0.5)] md:h-9" />
        {current && (
          <div key={`${tab}-${current.id}`} className="mb-10 mt-10 max-w-xl animate-fade-up">
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

        <RowHeader
          title={
            <>
              <span style={{ color: blue }}>Prime</span> Top 10 en tendencia en España <TrendingUp className="size-4" style={{ color: blue }} />
            </>
          }
          note={trendingNote(provider.provider_name)}
        >
          <TypeTabs top={top} tab={tab} onChange={(t) => (setTab(t), setIndex(0))} className="bg-white/10" activeStyle={{ background: blue, color: "#fff" }} />
        </RowHeader>
      </div>

      <Scroller className={cn(ROW_PAD, "pb-8 [--h:126px] md:[--h:158px]")} gap="gap-3 md:gap-4">
        {items.map((it, i) => {
          const on = it === current;
          return (
            <button
              key={`${tab}-${it.id}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={on}
              aria-label={`${it.rank}. ${it.title}`}
              className="group relative flex h-(--h) items-end outline-none"
            >
              <RankNumber rank={it.rank} variant="solid" bg={PRIME_BG} from={on ? "#7cc8ff" : "#f2f5f8"} to={on ? blue : "#7d8c99"} />
              <span
                className={cn(
                  "relative -ml-[calc(var(--h)*0.14)] block aspect-video h-full overflow-hidden rounded-md shadow-[0_10px_30px_rgb(0_0_0/0.6)] transition duration-300",
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

const MAX_BG = "#05070b";

/**
 * Same billboard layout, dressed as HBO Max: near-black navy, the app's glass "TOP 10" lettering
 * and glass ranks beside square-cornered posters with a white focus border.
 */
function MaxTop({ provider, top }: Props) {
  const [tab, setTab] = useTab(top);
  const { index, handlers, reset } = useHoverPreview();
  const items = top[tab];
  const current = items[Math.min(index, items.length - 1)];
  return (
    <section
      className="relative isolate my-6 flex h-[calc(100svh-4rem)] min-h-[560px] flex-col overflow-hidden md:my-10"
      style={{ background: MAX_BG }}
      aria-label={`Top 10 en tendencia en ${provider.provider_name}`}
    >
      <div className="absolute inset-0 -z-10" aria-hidden>
        {current?.backdrop_path && <CrossfadeBackdrop id={`${tab}-${current.id}`} src={current.backdrop_path} />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070b] via-[#05070b]/70 to-transparent md:w-3/4 md:via-[#05070b]/50" />
        <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-[#05070b] via-[#05070b]/85 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#05070b] to-transparent" />
        {/* the faint navy floor of the HBO Max app */}
        <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "radial-gradient(80% 100% at 50% 100%, rgb(30 41 66 / 0.45), transparent 70%)" }} />
      </div>

      <div className="container-page flex min-h-0 flex-1 flex-col pt-6 md:pt-8">
        <HboMaxWordmark className="h-8 w-auto shrink-0 self-start text-white drop-shadow-[0_2px_10px_rgb(0_0_0/0.5)] md:h-10" />
        {/* Sized by the free space (container query units), so the title never climbs into the wordmark */}
        <div className="relative min-h-0 flex-1 [container-type:size]">
          {current && (
            <div key={`${tab}-${current.id}`} className="absolute bottom-0 left-0 max-w-xl animate-fade-up pb-8 md:pb-10">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/80 [@container(max-height:17rem)]:hidden">
                Nº {current.rank} · Top 10 en tendencia
              </p>
              {current.logo ? (
                <h3 className="mb-4">
                  <span className="sr-only">{current.title}</span>
                  <Image
                    src={current.logo.file_path}
                    alt=""
                    width={500}
                    height={Math.round(500 / current.logo.aspect_ratio)}
                    sizes="420px"
                    className="h-auto max-h-[clamp(2rem,calc(100cqh-19rem),8rem)] w-auto max-w-[min(420px,75vw)] object-contain object-left drop-shadow-[0_2px_12px_rgb(0_0_0/0.6)] [@container(max-height:23rem)]:max-h-[clamp(2rem,calc(100cqh-14rem),8rem)] [@container(max-height:17rem)]:max-h-[clamp(2rem,calc(100cqh-11.5rem),8rem)]"
                  />
                </h3>
              ) : (
                <h3 className="mb-3 line-clamp-2 text-3xl font-bold tracking-tight md:text-5xl [@container(max-height:23rem)]:text-3xl">{current.title}</h3>
              )}
              <p className="mb-1.5 text-base font-bold">En tendencia en España</p>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70 [@container(max-height:17rem)]:hidden">
                {current.vote_count >= 20 && <Rating value={current.vote_average} votes={current.vote_count} className="text-sm" />}
                {current.date && <span>{year(current.date)}</span>}
                {current.genres.length > 0 && <span>{current.genres.join(" · ")}</span>}
              </div>
              <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-white/85 md:text-base [@container(max-height:23rem)]:hidden [@container(min-height:32rem)]:line-clamp-3">{current.overview}</p>
              <Link
                href={mediaHref(current)}
                className="inline-flex h-11 items-center gap-2 rounded-[4px] bg-[#e8e8e8] px-5 text-sm font-semibold text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:h-12 md:px-6 md:text-base"
              >
                <Info className="size-5" /> Dónde verla
              </Link>
            </div>
          )}
        </div>

        <RowHeader
          title={
            <span className="flex items-center gap-3 pb-1.5 md:gap-4">
              <MaxTop10Mark className="h-9 w-auto md:h-12" />
              <span className="text-[10px] font-medium uppercase leading-snug tracking-[0.42em] md:text-xs">
                {tab === "tv" ? "Series" : "Películas"}
                <br />
                en tendencia
              </span>
            </span>
          }
          note={trendingNote(provider.provider_name)}
        >
          <TypeTabs top={top} tab={tab} onChange={(t) => (reset(), setTab(t))} className="border border-white/15 bg-black/40 backdrop-blur" activeStyle={{ background: "#e8e8e8", color: "#000" }} />
        </RowHeader>
      </div>

      <Scroller className={cn(ROW_PAD, "pb-6 [--h:clamp(150px,24svh,190px)] md:pb-8 md:[--h:clamp(160px,28svh,250px)]")} gap="gap-3 md:gap-5">
        {items.map((it, i) => {
          const on = it === current;
          return (
            <Link key={`${tab}-${it.id}`} href={mediaHref(it)} {...handlers(i)} className="group relative flex h-(--h) items-end outline-none" aria-label={`${it.rank}. ${it.title}`}>
              <span className="block h-[52%]">
                <MaxRank rank={it.rank} />
              </span>
              <span
                className={cn(
                  "relative block aspect-[2/3] h-full overflow-hidden bg-white/5 ring-inset transition duration-300 ease-out-expo",
                  on ? "ring-2 ring-white" : "group-hover:ring-2 group-hover:ring-white group-focus-visible:ring-2 group-focus-visible:ring-white",
                )}
              >
                <Image src={(it.poster_path ?? it.backdrop_path)!} alt="" fill sizes="170px" className="object-cover" />
                {/* ring-inset sits under the image, so draw the border on top */}
                <span className={cn("pointer-events-none absolute inset-0 ring-2 ring-inset ring-white transition-opacity", on ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100")} aria-hidden />
              </span>
            </Link>
          );
        })}
      </Scroller>
    </section>
  );
}

// HBO Max sets its Top 10 artwork in a Gotham-like geometric face; Montserrat is the closest free match.
const maxFont = Montserrat({ subsets: ["latin"], weight: ["700", "800"], display: "swap" });

/** Montserrat 700 at 186px (canvas): [ink left, ink right]. Baseline at y=139, caps 132.4 high. */
const MAX_DIGITS: Record<number, [number, number]> = {
  1: [1.3, 57.5], 2: [0.3, 104.6], 3: [-0.2, 103.5], 4: [5.7, 126.5], 5: [1.9, 105.6],
  6: [7.3, 114.8], 7: [4.8, 109.1], 8: [6.6, 116.2], 9: [3.8, 111.3], 10: [1.3, 191.9],
};
const MAX_DEPTH = 9; // glass thickness: extrusion towards the bottom-left, in glyph units

/** HBO Max rank: a thick glass digit, box cropped to its ink (plus rim and extrusion). */
function MaxRank({ rank }: { rank: number }) {
  const [l, r] = MAX_DIGITS[rank] ?? MAX_DIGITS[10];
  const pad = 6;
  const x = l - pad - MAX_DEPTH;
  return (
    <GlassGlyphs
      text={String(rank)}
      viewBox={`${x} ${6.6 - pad} ${r + pad - x} ${134.6 + pad * 2 + MAX_DEPTH}`}
      fontWeight={700}
      depth={MAX_DEPTH}
      className="h-full w-auto shrink-0 overflow-visible"
    />
  );
}

/** HBO Max's "TOP 10" lettering, same glass (flatter: no extrusion). */
function MaxTop10Mark({ className }: { className?: string }) {
  return <GlassGlyphs text="TOP 10" viewBox="-8 -2 677 152" fontWeight={800} k={1.6} className={className} />;
}

/**
 * Glass lettering after HBO Max's Top 10 artwork. Layers, back to front:
 *  1. extrusion (optional): stacked copies stepping to the bottom-left, lit side face with a bright back edge
 *  2. face: deep navy gradient
 *  3. lighting (SVG filter on the text alpha, so overlapping font contours never show as seams):
 *     a blurred-alpha height map lit by a cool key light (top-left) and a fill light (bottom-right)
 *     gives the rounded "tube" bevel with glints on both edges; a dark hairline just inside the
 *     edge and a thin silver rim outside it separate the glass from the background
 *  4. reflection: a soft sheen over the upper half, cut by a horizon line
 * `k` scales the filter for marks drawn small (filter lengths are in viewBox units).
 */
function GlassGlyphs({
  text,
  viewBox,
  fontWeight,
  depth = 0,
  k = 1,
  className,
}: {
  text: string;
  viewBox: string;
  fontWeight: number;
  depth?: number;
  k?: number;
  className?: string;
}) {
  const id = "gl" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const glyph = { x: 0, y: 139, fontSize: 186, fontWeight, fontFamily: maxFont.style.fontFamily } as const;
  const steps = depth ? Array.from({ length: 8 }, (_, i) => ((8 - i) * depth) / 8) : [];
  return (
    <svg viewBox={viewBox} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}face`} x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0" stopColor="#1f2737" />
          <stop offset="0.45" stopColor="#0a0e15" />
          <stop offset="1" stopColor="#131a26" />
        </linearGradient>
        <linearGradient id={`${id}side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a465c" />
          <stop offset="1" stopColor="#0b0f16" />
        </linearGradient>
        <linearGradient id={`${id}sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe8ff" stopOpacity="0.16" />
          <stop offset="0.46" stopColor="#dfe8ff" stopOpacity="0.06" />
          <stop offset="0.47" stopColor="#dfe8ff" stopOpacity="0" />
          <stop offset="1" stopColor="#dfe8ff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}lit`} x="-8%" y="-12%" width="116%" height="124%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={2.6 * k} result="height" />
          <feSpecularLighting in="height" surfaceScale={10} specularConstant={1.25} specularExponent={55} lightingColor="#f2f6ff" result="key">
            <feDistantLight azimuth={225} elevation={48} />
          </feSpecularLighting>
          <feSpecularLighting in="height" surfaceScale={10} specularConstant={0.6} specularExponent={45} lightingColor="#9fb2d6" result="fill">
            <feDistantLight azimuth={40} elevation={44} />
          </feSpecularLighting>
          <feComposite in="key" in2="fill" operator="arithmetic" k2={1} k3={1} result="spec" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="bevel" />
          <feMorphology in="SourceAlpha" operator="erode" radius={1.1 * k} result="inset" />
          <feComposite in="SourceAlpha" in2="inset" operator="out" result="edgeBand" />
          <feFlood floodColor="#000" floodOpacity={0.6} />
          <feComposite in2="edgeBand" operator="in" result="hairline" />
          <feMorphology in="SourceAlpha" operator="dilate" radius={1.5 * k} result="grown" />
          <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
          <feFlood floodColor="#8792a5" />
          <feComposite in2="ring" operator="in" result="rimBase" />
          <feComposite in="spec" in2="ring" operator="in" result="rimGlint" />
          <feMerge>
            <feMergeNode in="bevel" />
            <feMergeNode in="hairline" />
            <feMergeNode in="rimBase" />
            <feMergeNode in="rimGlint" />
          </feMerge>
        </filter>
      </defs>
      <g style={{ filter: "drop-shadow(0 4px 6px rgb(0 0 0 / 0.6))" }}>
        {steps.map((d, i) => (
          <text
            key={d}
            {...glyph}
            transform={`translate(${-d} ${d})`}
            fill={`url(#${id}side)`}
            // only the deepest copy carries the bright back edge of the glass
            stroke={i === 0 ? "#6d788b" : "none"}
            strokeWidth={i === 0 ? 1.6 : 0}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {text}
          </text>
        ))}
        <text {...glyph} fill={`url(#${id}face)`}>
          {text}
        </text>
        <text {...glyph} fill="#fff" filter={`url(#${id}lit)`}>
          {text}
        </text>
        <text {...glyph} fill={`url(#${id}sheen)`}>
          {text}
        </text>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------- Disney+ */

const DISNEY_CYAN = "#23d3e6";
const DISNEY_BG = "#0e1018";

/**
 * Same billboard layout as Netflix, dressed as Disney+: navy tones, the logo's glowing arc,
 * uppercase buttons and tall cards with the rank in a dark corner cut by a big arc.
 */
function DisneyTop({ provider, top }: Props) {
  const [tab, setTab] = useTab(top);
  const { index, handlers, reset } = useHoverPreview();
  const items = top[tab];
  const current = items[Math.min(index, items.length - 1)];
  return (
    <section
      className="relative isolate my-6 flex h-[calc(100svh-4rem)] min-h-[560px] flex-col overflow-hidden md:my-10"
      style={{ background: DISNEY_BG }}
      aria-label={`Top 10 en tendencia en ${provider.provider_name}`}
    >
      <div className="absolute inset-0 -z-10" aria-hidden>
        {current?.backdrop_path && <CrossfadeBackdrop id={`${tab}-${current.id}`} src={current.backdrop_path} />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e1018] via-[#0e1018]/75 to-transparent md:w-3/4 md:via-[#0e1018]/55" />
        <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-[#0e1018] via-[#0e1018]/85 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0e1018] to-transparent" />
        {/* Disney+ navy glow rising from the bottom-left */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(70% 60% at 0% 100%, rgb(30 58 138 / 0.45), transparent 70%)" }} />
      </div>

      <div className="container-page flex min-h-0 flex-1 flex-col pt-6 md:pt-8">
        <DisneyPlusWordmark className="h-9 w-auto shrink-0 self-start text-white drop-shadow-[0_2px_10px_rgb(0_0_0/0.5)] md:h-12" />
        {/* Sized by the free space (container query units), so the title never climbs into the wordmark */}
        <div className="relative min-h-0 flex-1 [container-type:size]">
          {current && (
            <div key={`${tab}-${current.id}`} className="absolute bottom-0 left-0 max-w-xl animate-fade-up pb-8 md:pb-10">
              {current.logo ? (
                <h3 className="mb-4">
                  <span className="sr-only">{current.title}</span>
                  <Image
                    src={current.logo.file_path}
                    alt=""
                    width={500}
                    height={Math.round(500 / current.logo.aspect_ratio)}
                    sizes="420px"
                    className="h-auto max-h-[clamp(2rem,calc(100cqh-19rem),8rem)] w-auto max-w-[min(420px,75vw)] object-contain object-left drop-shadow-[0_2px_12px_rgb(0_0_0/0.6)] [@container(max-height:23rem)]:max-h-[clamp(2rem,calc(100cqh-14rem),8rem)] [@container(max-height:17rem)]:max-h-[clamp(2rem,calc(100cqh-11.5rem),8rem)]"
                  />
                </h3>
              ) : (
                <h3 className="mb-3 line-clamp-2 text-3xl font-bold tracking-tight md:text-5xl [@container(max-height:23rem)]:text-3xl">{current.title}</h3>
              )}
              <p className="mb-3 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/85">
                <span className="text-2xl font-bold tracking-normal md:text-3xl" style={{ color: DISNEY_CYAN }}>
                  {current.rank}
                </span>
                en tendencia en España
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75 [@container(max-height:17rem)]:hidden">
                {current.vote_count >= 20 && <Rating value={current.vote_average} votes={current.vote_count} className="text-sm" />}
                {current.date && <span>{year(current.date)}</span>}
                {current.genres.length > 0 && <span>{current.genres.join(" • ")}</span>}
              </div>
              <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-white/85 md:text-base [@container(max-height:23rem)]:hidden [@container(min-height:32rem)]:line-clamp-3">{current.overview}</p>
              <Link
                href={mediaHref(current)}
                className="inline-flex h-11 items-center gap-2 rounded-[4px] bg-[#f9f9f9] px-6 text-sm font-semibold uppercase tracking-[0.15em] text-[#0e1018] transition hover:bg-[#c6c6c6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:h-12"
              >
                <Info className="size-5" /> Dónde verla
              </Link>
            </div>
          )}
        </div>

        <RowHeader title={<>Top 10 en tendencia en España</>} note={trendingNote(provider.provider_name)}>
          <TypeTabs top={top} tab={tab} onChange={(t) => (reset(), setTab(t))} className="bg-white/10 backdrop-blur" activeStyle={{ background: "#f9f9f9", color: DISNEY_BG }} />
        </RowHeader>
      </div>

      <Scroller
        className={cn(ROW_PAD, "-mt-2 pb-4 [--h:clamp(170px,26svh,210px)] md:pb-6 md:[--h:clamp(150px,27svh,270px)]")}
        gap="gap-3 md:gap-4"
        py="py-5"
      >
        {items.map((it, i) => (
          <DisneyCard key={`${tab}-${it.id}`} item={it} active={it === current} {...handlers(i)} />
        ))}
      </Scroller>
    </section>
  );
}

/**
 * Disney+ Top 10 tile: artwork masked by a large circle so the top-left corner stays dark,
 * a cyan glow along that arc, the rank in the corner and logo + rating + year at the bottom.
 */
function DisneyCard({ item: it, active, ...events }: { item: RankedItem; active: boolean } & ReturnType<ReturnType<typeof useHoverPreview>["handlers"]>) {
  // Circle centred off-card (bottom-right) so its edge only cuts the top-left corner:
  // it crosses the left side at ~42% height and the top at ~55% width.
  const arc = "calc(var(--h) * 0.988)";
  const at = "at 145% 81%";
  return (
    <Link href={mediaHref(it)} aria-label={`${it.rank}. ${it.title}`} className="group block outline-none" {...events}>
      <span
        className={cn(
          "relative block aspect-[5/8] h-(--h) overflow-hidden rounded-lg shadow-[0_26px_30px_-10px_rgb(0_0_0/0.7)] ring-[3px] transition duration-300 ease-out-expo",
          "ring-transparent group-hover:scale-[1.04] group-hover:ring-[#f9f9f9]/85 group-focus-visible:ring-[#f9f9f9]/85",
        )}
        style={{ background: DISNEY_BG }}
      >
        <span
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle ${at}, transparent calc(${arc} - 2px), rgb(35 211 230 / 0.4) ${arc}, transparent calc(${arc} + 26px))` }}
          aria-hidden
        />
        <span className="absolute inset-0" style={{ maskImage: `radial-gradient(circle ${arc} ${at}, #000 99.5%, transparent 100%)` }} aria-hidden>
          <Image src={(it.backdrop_path ?? it.poster_path)!} alt="" fill sizes="190px" className="object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-[#0e1018] via-[#0e1018]/30 to-transparent" />
        </span>
        {active && <span className="pointer-events-none absolute inset-0 z-10 rounded-lg ring-[3px] ring-inset ring-[#f9f9f9]/85" aria-hidden />}
        <span className="absolute left-[8%] top-[4%] text-[calc(var(--h)*0.13)] font-bold leading-none tracking-tight" style={{ color: DISNEY_CYAN }} aria-hidden>
          {it.rank}
        </span>
        <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-[calc(var(--h)*0.03)] px-3 pb-[calc(var(--h)*0.06)] text-center">
          {it.logo ? (
            <Image
              src={it.logo.file_path}
              alt=""
              width={300}
              height={Math.round(300 / it.logo.aspect_ratio)}
              sizes="180px"
              className="h-auto max-h-[calc(var(--h)*0.2)] w-auto max-w-[88%] object-contain drop-shadow-[0_2px_10px_rgb(0_0_0/0.7)]"
            />
          ) : (
            <span className="line-clamp-2 text-base font-bold leading-tight">{it.title}</span>
          )}
          <span className="flex items-center gap-2 text-[11px] text-white/75">
            {it.vote_count >= 20 && <Rating value={it.vote_average} votes={it.vote_count} className="text-[11px]" />}
            {it.date && <span>{year(it.date)}</span>}
          </span>
        </span>
      </span>
    </Link>
  );
}
