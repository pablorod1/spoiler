"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Film, Info, TrendingUp, Tv } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { mediaHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PlatformTop, RankedItem } from "@/lib/tmdb/platform-top";
import type { Provider } from "@/lib/tmdb/types";

const INTERVAL = 8000;
const dayMonth = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" });

function weekLabel(end?: string) {
  if (!end) return null;
  const e = new Date(end + "T00:00:00");
  const s = new Date(e.getTime() - 6 * 86400000);
  const sameMonth = s.getMonth() === e.getMonth();
  return `Semana del ${sameMonth ? s.getDate() : dayMonth.format(s)} al ${dayMonth.format(e)}`;
}

/**
 * Full-bleed platform section: the platform's Top 10 (official for Netflix, a
 * recent-popularity estimate otherwise) with the selected title as a hero backdrop.
 */
export function GenericTop({
  provider,
  theme,
  top,
}: {
  provider: Pick<Provider, "provider_id" | "provider_name" | "logo_path">;
  theme: { color: string; tint: string };
  top: PlatformTop;
}) {
  const initialTab = top.tv.length >= 5 || !top.movie.length ? "tv" : "movie";
  const [tab, setTab] = useState<"tv" | "movie">(initialTab);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const items: RankedItem[] = top[tab];
  const official = top.source === "official";
  const brandFg = theme.color === "#e5e5ea" ? "#000" : "#fff";
  const brandBg = theme.color === "#e5e5ea" ? "#fff" : theme.color;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.4), { threshold: [0, 0.4, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || items.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % items.length), INTERVAL);
    return () => clearTimeout(t);
  }, [index, inView, items.length]);

  // keep the active poster in view inside the strip (without scrolling the page)
  useEffect(() => {
    const s = strip.current;
    const el = s?.children[index] as HTMLElement | undefined;
    if (!s || !el) return;
    const left = el.offsetLeft - s.clientWidth / 2 + el.clientWidth / 2;
    s.scrollTo({ left, behavior: "smooth" });
  }, [index, tab]);

  // vertical parallax on the backdrop
  const frame = useRef(0);
  const paint = useCallback(() => {
    frame.current = 0;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--y", Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)).toFixed(4));
  }, []);
  useEffect(() => {
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(paint);
    };
    paint();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [paint]);

  if (!top.tv.length && !top.movie.length) return null;
  const current = items[Math.min(index, items.length - 1)];
  const switchTab = (t: "tv" | "movie") => {
    setTab(t);
    setIndex(0);
  };

  return (
    <section
      ref={ref}
      className="relative isolate my-6 overflow-hidden md:my-10"
      aria-label={`${official ? "Top 10" : "Tendencias"} en ${provider.provider_name}`}
      style={{ "--y": 0, background: theme.tint } as React.CSSProperties}
    >
      {/* backdrops */}
      <div className="absolute inset-0 -z-10">
        {items.map((it, i) => (
          <div
            key={`${tab}-${it.id}`}
            className={cn("absolute -inset-y-[8%] inset-x-0 transition-opacity duration-1000 ease-out-expo", it === current ? "opacity-100" : "opacity-0")}
            style={{ transform: "translate3d(0, calc(var(--y) * -6%), 0)" }}
            aria-hidden={it !== current}
          >
            {Math.abs(i - index) <= 1 || it === current ? (
              <Image
                src={it.backdrop_path!}
                alt=""
                fill
                sizes="100vw"
                className={cn("object-cover object-[center_25%] transition-transform duration-[10s] ease-linear", it === current && inView ? "scale-110" : "scale-100")}
              />
            ) : null}
          </div>
        ))}
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.tint} 0%, ${theme.tint}e6 22%, ${theme.tint}66 48%, transparent 72%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-bg/40" />
        <div className="absolute -left-40 top-0 size-[36rem] rounded-full opacity-35 blur-3xl" style={{ background: theme.color }} />
      </div>

      <div className="container-page flex min-h-[88svh] flex-col pb-6 pt-14 md:min-h-[94svh] md:pt-20">
        {/* header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src={provider.logo_path} alt="" width={56} height={56} sizes="56px" className="size-12 rounded-2xl shadow-xl ring-1 ring-white/20 md:size-14" />
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                {official ? <BadgeCheck className="size-3.5" style={{ color: brandBg }} /> : <TrendingUp className="size-3.5" />}
                {official ? "Top 10 oficial · España" : "Tendencias esta semana · España"}
              </p>
              <h2 className="text-2xl font-black tracking-tight md:text-4xl">
                {official ? "Top 10 en " : "Lo más visto en "}
                {provider.provider_name}
              </h2>
              <p className="mt-0.5 text-xs text-white/55">
                {official
                  ? `${weekLabel(top.week)} · datos publicados por Netflix`
                  : `Tendencias de la semana disponibles en ${provider.provider_name}. No publica un ranking oficial.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-white/15 bg-black/30 p-1 backdrop-blur-md" role="tablist" aria-label="Tipo">
              {(["tv", "movie"] as const).map((t) =>
                top[t].length ? (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => switchTab(t)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-white",
                      tab !== t && "text-white/70 hover:text-white",
                    )}
                    style={tab === t ? { background: brandBg, color: brandFg } : undefined}
                  >
                    {t === "tv" ? <Tv className="size-4" /> : <Film className="size-4" />}
                    {t === "tv" ? "Series" : "Películas"}
                  </button>
                ) : null,
              )}
            </div>
            <Link
              href={`/${tab === "tv" ? "series" : "peliculas"}?plataformas=${provider.provider_id}`}
              className="group hidden h-11 items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-4 text-sm font-semibold backdrop-blur-md transition hover:bg-white/10 md:inline-flex"
            >
              Ver todo <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </header>

        {/* featured */}
        <div className="flex flex-1 items-end py-8 md:py-10">
          {current && (
            <div key={`${tab}-${current.id}`} className="flex max-w-2xl animate-fade-up items-end gap-5">
              <span
                className="hidden shrink-0 select-none pr-6 text-[9rem] font-black italic leading-[0.75] tracking-tighter md:block lg:pr-8 lg:text-[11rem]"
                style={{ WebkitTextStroke: `2px ${brandBg}`, color: "transparent" }}
                aria-hidden
              >
                {current.rank}
              </span>
              <div className="min-w-0">
                {current.logo ? (
                  <h3 className="mb-4">
                    <span className="sr-only">
                      {current.rank}. {current.title}
                    </span>
                    <Image
                      src={current.logo.file_path}
                      alt=""
                      width={500}
                      height={Math.round(500 / current.logo.aspect_ratio)}
                      sizes="(min-width:768px) 420px, 75vw"
                      className="h-auto max-h-28 w-auto max-w-[min(420px,78vw)] object-contain object-left drop-shadow-[0_4px_24px_rgb(0_0_0/0.65)] md:max-h-36"
                    />
                  </h3>
                ) : (
                  <h3 className="mb-3 text-3xl font-black tracking-tight text-balance md:text-5xl">{current.title}</h3>
                )}
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
                  <span className="font-bold md:hidden" style={{ color: brandBg }}>
                    #{current.rank}
                  </span>
                  {current.vote_count >= 20 && <Rating value={current.vote_average} votes={current.vote_count} className="text-sm" />}
                  {current.date && <span>{year(current.date)}</span>}
                  {current.genres.map((g) => (
                    <span key={g} className="text-white/60">
                      {g}
                    </span>
                  ))}
                  {official && current.weeksInTop && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
                      {current.weeksInTop === 1 ? "Nueva esta semana" : `${current.weeksInTop} semanas en el Top 10`}
                    </span>
                  )}
                </div>
                <p className="mb-6 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/75 md:line-clamp-3 md:text-base">{current.overview}</p>
                <Link
                  href={mediaHref(current)}
                  className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:brightness-110 active:scale-[0.98]"
                  style={{ background: brandBg, color: brandFg }}
                >
                  <Info className="size-4" /> Dónde verla
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ranked strip */}
        <div ref={strip} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-4 pb-2 pt-3 md:-mx-2 md:px-2" role="tablist" aria-label={`Ranking ${tab === "tv" ? "series" : "películas"}`}>
          {items.map((it, i) => {
            const on = it === current;
            return (
              <button
                key={`${tab}-${it.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={`${it.rank}. ${it.title}`}
                onClick={() => setIndex(i)}
                className="group relative flex shrink-0 items-end pl-7 outline-none md:pl-9"
              >
                <span
                  className={cn(
                    "absolute bottom-0 left-0 z-10 select-none text-6xl font-black italic leading-[0.8] tracking-tighter transition md:text-7xl",
                    on ? "" : "text-white/85",
                  )}
                  style={{ WebkitTextStroke: "1.5px rgb(0 0 0 / 0.5)", color: on ? brandBg : undefined, textShadow: "0 4px 18px rgb(0 0 0 / 0.8)" }}
                  aria-hidden
                >
                  {it.rank}
                </span>
                <span
                  className={cn(
                    "relative block aspect-[2/3] w-24 overflow-hidden rounded-xl transition duration-300 ease-out-expo group-focus-visible:ring-2 group-focus-visible:ring-white md:w-28",
                    on ? "-translate-y-2" : "opacity-70 group-hover:-translate-y-1 group-hover:opacity-100",
                  )}
                  style={on ? { boxShadow: `0 0 0 2px #08080b, 0 0 0 4px ${brandBg}, 0 18px 40px -12px rgb(0 0 0 / 0.9)` } : undefined}
                >
                  <Image src={it.poster_path!} alt="" fill sizes="112px" className="object-cover" />
                  {on && inView && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                      <span key={`${tab}-${index}`} className="block h-full" style={{ background: brandBg, animation: `ptop-progress ${INTERVAL}ms linear forwards` }} />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes ptop-progress{from{width:0}to{width:100%}}`}</style>
    </section>
  );
}
