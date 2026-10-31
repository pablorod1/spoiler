"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Film, Info, Tv } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { mediaHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SpotlightItem } from "@/lib/tmdb/api";
import type { Provider } from "@/lib/tmdb/types";

const INTERVAL = 7000;

/**
 * Platform showcase themed with the service's brand colour: rotating featured title
 * with crossfading backdrop + parallax, and a poster strip to jump between titles.
 */
export function PlatformSpotlight({
  provider,
  theme,
  items,
  eyebrow = "Lo más visto en",
}: {
  provider: Pick<Provider, "provider_id" | "provider_name" | "logo_path">;
  theme: { color: string; tint: string };
  items: SpotlightItem[];
  eyebrow?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Only rotate while on screen, so each showcase starts fresh when you reach it.
  useEffect(() => {
    if (!inView || items.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % items.length), INTERVAL);
    return () => clearTimeout(t);
  }, [index, inView, items.length]);

  // Vertical parallax on the backdrop
  const frame = useRef(0);
  const paint = useCallback(() => {
    frame.current = 0;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const y = Math.max(-1, Math.min(1, (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight));
    el.style.setProperty("--y", y.toFixed(4));
  }, []);
  useEffect(() => {
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [paint]);

  if (!items.length) return null;
  const current = items[index];
  const TypeIcon = current.media_type === "movie" ? Film : Tv;
  const allHref = `/peliculas?plataformas=${provider.provider_id}`;

  return (
    <section ref={ref} className="container-page py-8 md:py-10" aria-label={`${eyebrow} ${provider.provider_name}`} style={{ "--y": 0 } as React.CSSProperties}>
      <div
        className="relative isolate overflow-hidden rounded-[2rem] ring-1 ring-white/10"
        style={{ background: `linear-gradient(135deg, ${theme.tint} 0%, #08080b 70%)` }}
      >
        {/* backdrops (crossfade) */}
        <div
          className="absolute inset-0 -z-10"
          style={{ maskImage: "linear-gradient(90deg, transparent 0%, #000 45%)", WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 45%)" }}
        >
          {items.map((it, i) => (
            <div
              key={it.id}
              className={cn("absolute -inset-y-[8%] inset-x-0 transition-opacity duration-1000 ease-out-expo motion-reduce:transition-none", i === index ? "opacity-100" : "opacity-0")}
              style={{ transform: "translate3d(0, calc(var(--y) * -6%), 0)" }}
              aria-hidden={i !== index}
            >
              <Image
                src={it.backdrop_path!}
                alt=""
                fill
                sizes="100vw"
                className={cn("object-cover transition-transform duration-[9s] ease-linear", i === index && inView ? "scale-110" : "scale-100")}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080b] via-[#08080b]/30 to-transparent" />
        </div>
        {/* brand glow */}
        <div
          className="pointer-events-none absolute -left-32 -top-32 -z-10 size-[28rem] rounded-full opacity-40 blur-3xl"
          style={{ background: theme.color }}
          aria-hidden
        />

        <div className="flex min-h-[560px] flex-col justify-between gap-8 p-6 md:h-[78svh] md:max-h-[820px] md:p-10 lg:p-12">
          {/* header */}
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src={provider.logo_path} alt="" width={48} height={48} sizes="48px" className="size-11 rounded-xl shadow-lg ring-1 ring-white/20 md:size-12" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">{eyebrow}</p>
                <h2 className="text-xl font-black tracking-tight md:text-2xl">{provider.provider_name}</h2>
              </div>
            </div>
            <Link
              href={allHref}
              className="group hidden h-10 items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-4 text-sm font-semibold backdrop-blur-md transition hover:bg-white/10 sm:inline-flex"
            >
              Ver todo <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
          </header>

          {/* featured */}
          <div key={current.id} className="max-w-xl animate-fade-up">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              <TypeIcon className="size-3.5" /> {current.media_type === "movie" ? "Película" : "Serie"}
            </p>
            {current.logo ? (
              <h3 className="mb-4">
                <span className="sr-only">{current.title}</span>
                <Image
                  src={current.logo.file_path}
                  alt=""
                  width={500}
                  height={Math.round(500 / current.logo.aspect_ratio)}
                  sizes="(min-width:768px) 400px, 70vw"
                  className="h-auto max-h-28 w-auto max-w-[min(400px,75vw)] object-contain object-left drop-shadow-[0_4px_20px_rgb(0_0_0/0.6)] md:max-h-32"
                />
              </h3>
            ) : (
              <h3 className="mb-3 text-3xl font-black tracking-tight text-balance md:text-5xl">{current.title}</h3>
            )}
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
              {current.vote_count >= 20 && <Rating value={current.vote_average} votes={current.vote_count} className="text-sm" />}
              {current.date && <span>{year(current.date)}</span>}
              {current.genres.map((g) => (
                <span key={g} className="text-white/60">
                  {g}
                </span>
              ))}
            </div>
            <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-white/75 md:line-clamp-3 md:text-base">{current.overview}</p>
            <Link
              href={mediaHref(current)}
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
              style={{ background: theme.color === "#e5e5ea" ? "#fff" : theme.color, color: theme.color === "#e5e5ea" ? "#000" : "#fff" }}
            >
              <Info className="size-4" /> Ver ficha
            </Link>
          </div>

          {/* poster strip */}
          <div className="no-scrollbar -mx-2 flex gap-3 overflow-x-auto p-2" role="tablist" aria-label={`Títulos en ${provider.provider_name}`}>
            {items.map((it, i) => {
              const on = i === index;
              return (
                <button
                  key={it.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={it.title}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "group relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl transition duration-300 ease-out-expo outline-none focus-visible:ring-2 focus-visible:ring-white md:w-24",
                    on ? "-translate-y-1 shadow-[0_12px_30px_-8px_rgb(0_0_0/0.8)]" : "opacity-55 hover:opacity-100",
                  )}
                  style={on ? { boxShadow: `0 0 0 2px #08080b, 0 0 0 4px ${theme.color}` } : undefined}
                >
                  <Image src={it.poster_path!} alt="" fill sizes="96px" className="object-cover" />
                  {on && inView && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                      <span
                        key={index}
                        className="block h-full"
                        style={{ background: theme.color, animation: `spot-progress ${INTERVAL}ms linear forwards` }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes spot-progress{from{width:0}to{width:100%}}`}</style>
    </section>
  );
}
