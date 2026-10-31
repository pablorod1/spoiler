"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Film, Info, Play, Tv, Volume2, VolumeX } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { mediaHref } from "@/lib/tmdb/normalize";
import { formatRuntime, year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { FeaturedTrailer } from "@/lib/tmdb/api";

const VIDEO_DELAY = 3000; // trailer starts 3 s after a slide becomes active
const ADVANCE_AFTER = 40000; // then moves on (unless the user turned the sound on)

/**
 * Apple TV–style carousel: near full-viewport slides, horizontal + vertical parallax,
 * and a muted trailer that fades in over the backdrop after a few seconds.
 */
export function TrailerCarousel({ items }: { items: FeaturedTrailer[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const iframes = useRef<(HTMLIFrameElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // Which slide has its trailer mounted / faded in. Everything else is derived.
  const [playingFor, setPlayingFor] = useState<number | null>(null);
  const [visibleFor, setVisibleFor] = useState<number | null>(null);
  const [sound, setSound] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* ---- parallax: write CSS variables per frame, no React re-renders ---- */
  const frame = useRef(0);
  const paint = useCallback(() => {
    frame.current = 0;
    const t = track.current;
    const s = section.current;
    if (!t || !s) return;
    const center = t.scrollLeft + t.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    slides.current.forEach((el, i) => {
      if (!el) return;
      const o = (el.offsetLeft + el.clientWidth / 2 - center) / el.clientWidth;
      el.style.setProperty("--o", o.toFixed(4));
      el.style.setProperty("--fade", Math.max(0, 1 - Math.abs(o) * 1.6).toFixed(3));
      if (Math.abs(o) < best) {
        best = Math.abs(o);
        nearest = i;
      }
    });
    const r = s.getBoundingClientRect();
    const y = Math.max(-1, Math.min(1, (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight));
    s.style.setProperty("--y", y.toFixed(4));
    setActive((a) => (a === nearest ? a : nearest));
  }, []);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame.current);
    };
  }, [paint, schedule]);

  /* ---- only play while the section is on screen ---- */
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.55), { threshold: [0, 0.55, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const playing = inView && playingFor === active;
  const visible = playing && visibleFor === active;

  /* ---- trailer timer: starts whenever a slide becomes active and visible ---- */
  useEffect(() => {
    if (!inView || reduced) return;
    const t = setTimeout(() => setPlayingFor(active), VIDEO_DELAY);
    return () => clearTimeout(t);
  }, [active, inView, reduced]);

  const goTo = useCallback((i: number) => {
    const t = track.current;
    const el = slides.current[(i + items.length) % items.length];
    if (!t || !el) return;
    t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [items.length]);

  /* ---- auto-advance, unless the user is listening ---- */
  useEffect(() => {
    if (!inView || sound || items.length < 2) return;
    const t = setTimeout(() => goTo(active + 1), ADVANCE_AFTER);
    return () => clearTimeout(t);
  }, [active, inView, sound, goTo, items.length]);

  const command = (func: "mute" | "unMute" | "setVolume", args: unknown[] = []) =>
    iframes.current[active]?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  const toggleSound = () => {
    if (!playing) {
      setSound(true);
      setPlayingFor(active);
      return;
    }
    if (sound) command("mute");
    else {
      command("unMute");
      command("setVolume", [70]);
    }
    setSound((s) => !s);
  };

  if (!items.length) return null;

  return (
    <section
      ref={section}
      className="relative py-8 md:py-12"
      aria-roledescription="carrusel"
      aria-label="Tráilers destacados"
      style={{ "--y": 0 } as React.CSSProperties}
    >
      <div className="container-page mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-accent">Tráilers</p>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">No te los pierdas</h2>
        </div>
        <div className="hidden gap-2 md:flex">
          <button type="button" onClick={() => goTo(active - 1)} aria-label="Anterior" className="grid size-10 place-items-center rounded-full border border-line bg-surface/80 text-muted transition hover:border-line-strong hover:text-fg">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => goTo(active + 1)} aria-label="Siguiente" className="grid size-10 place-items-center rounded-full border border-line bg-surface/80 text-muted transition hover:border-line-strong hover:text-fg">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div
        ref={track}
        onScroll={schedule}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[4vw] md:gap-5 md:px-[7vw]"
      >
        {items.map((it, i) => {
          const isActive = i === active;
          const TypeIcon = it.media.media_type === "movie" ? Film : Tv;
          const meta = [
            year(it.media.date),
            it.certification && (/^\d+$/.test(it.certification) ? `+${it.certification}` : it.certification),
            it.media.media_type === "movie" ? formatRuntime(it.runtime) : it.seasons ? `${it.seasons} temporada${it.seasons > 1 ? "s" : ""}` : null,
            ...it.genres,
          ].filter(Boolean);

          return (
            <article
              key={`${it.media.media_type}-${it.media.id}`}
              ref={(el) => {
                slides.current[i] = el;
              }}
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${items.length}: ${it.media.title}`}
              className="relative h-[78svh] max-h-[920px] min-h-[480px] w-[92vw] shrink-0 snap-center overflow-hidden rounded-3xl bg-surface ring-1 ring-white/10 md:h-[86svh] md:w-[86vw]"
              style={{ "--o": 0, "--fade": i === 0 ? 1 : 0 } as React.CSSProperties}
            >
              {/* backdrop: moves against the swipe and with page scroll */}
              <div
                className="absolute -inset-[10%] will-change-transform"
                style={
                  reduced
                    ? undefined
                    : { transform: "translate3d(calc(var(--o) * -14%), calc(var(--y) * -5%), 0) scale(1.04)" }
                }
              >
                <Image
                  src={it.media.backdrop_path!}
                  alt=""
                  fill
                  sizes="92vw"
                  priority={i === 0}
                  className={cn("object-cover transition-opacity duration-1000", isActive && visible && "opacity-0")}
                />
              </div>

              {/* muted trailer, cover-scaled, fades in once loaded */}
              {isActive && playing && (
                <div className={cn("pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000", visible ? "opacity-100" : "opacity-0")}>
                  <iframe
                    ref={(el) => {
                      iframes.current[i] = el;
                    }}
                    title={`Tráiler de ${it.media.title}`}
                    src={`https://www.youtube-nocookie.com/embed/${it.trailerKey}?autoplay=1&mute=${sound ? 0 : 1}&controls=0&rel=0&playsinline=1&loop=1&playlist=${it.trailerKey}&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    onLoad={() => setTimeout(() => setVisibleFor(i), 1200)}
                    className="absolute left-1/2 top-1/2 aspect-video min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.2]"
                    style={{ width: "max(100%, calc(86svh * 16 / 9))" }}
                  />
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

              {/* content: drifts slightly faster than the card */}
              <div
                className="absolute inset-x-0 bottom-0 p-6 md:p-12 lg:p-16"
                style={
                  reduced
                    ? undefined
                    : { transform: "translate3d(calc(var(--o) * 18%), 0, 0)", opacity: "var(--fade)" }
                }
              >
                <div className="max-w-xl">
                  <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                    <TypeIcon className="size-3.5" />
                    {it.media.media_type === "movie" ? "Película" : "Serie"}
                  </p>
                  {it.logo ? (
                    <h3 className="mb-5">
                      <span className="sr-only">{it.media.title}</span>
                      <Image
                        src={it.logo.file_path}
                        alt=""
                        width={500}
                        height={Math.round(500 / it.logo.aspect_ratio)}
                        sizes="(min-width:768px) 440px, 70vw"
                        className="h-auto max-h-32 w-auto max-w-[min(440px,72vw)] object-contain object-left drop-shadow-[0_4px_24px_rgb(0_0_0/0.7)] md:max-h-40"
                      />
                    </h3>
                  ) : (
                    <h3 className="mb-4 text-4xl font-black tracking-tight text-balance md:text-6xl">{it.media.title}</h3>
                  )}
                  <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
                    {it.media.vote_count >= 20 && <Rating value={it.media.vote_average} votes={it.media.vote_count} className="text-sm" />}
                    {meta.map((m, k) => (
                      <span key={k}>{m}</span>
                    ))}
                  </div>
                  <p className="mb-6 line-clamp-2 max-w-lg text-sm leading-relaxed text-white/75 md:line-clamp-3 md:text-base">{it.media.overview}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={mediaHref(it.media)}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
                    >
                      <Info className="size-4" /> Dónde verla
                    </Link>
                    {isActive && (
                      <button
                        type="button"
                        onClick={toggleSound}
                        aria-pressed={playing && sound}
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20"
                      >
                        {!playing ? (
                          <>
                            <Play className="size-4 fill-current" /> Ver tráiler
                          </>
                        ) : sound ? (
                          <>
                            <Volume2 className="size-4" /> Sonido activado
                          </>
                        ) : (
                          <>
                            <VolumeX className="size-4" /> Activar sonido
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* countdown to the trailer */}
              {isActive && inView && !reduced && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                  <div
                    key={`${active}-${playing}`}
                    className="h-full bg-accent"
                    style={{ animation: playing ? "none" : `trailer-countdown ${VIDEO_DELAY}ms linear forwards`, width: playing ? "100%" : undefined, opacity: playing ? 0 : 1, transition: "opacity 600ms" }}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label="Elegir tráiler">
        {items.map((it, i) => (
          <button
            key={it.media.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={it.media.title}
            onClick={() => goTo(i)}
            className={cn("h-1.5 rounded-full transition-all duration-500", i === active ? "w-8 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60")}
          />
        ))}
      </div>
      <style>{`@keyframes trailer-countdown{from{width:0}to{width:100%}}`}</style>
    </section>
  );
}
