"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Film, Info, Minimize2, Pause, Play, SkipBack, SkipForward, Tv, Volume2, VolumeX } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { mediaHref } from "@/lib/tmdb/normalize";
import { formatRuntime, year } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ROW_PAD } from "./row-pad";
import type { FeaturedTrailer } from "@/lib/tmdb/api";

const startPad = (el: HTMLElement) => parseFloat(getComputedStyle(el).paddingLeft) || 0;

const VIDEO_DELAY = 5000; // trailer starts 5 s after a slide becomes active
const ADVANCE_AFTER = 40000; // then moves on (unless the user turned the sound on)
const IDLE_AFTER = 2500; // cinema controls fade out when the mouse rests
const REVEAL_AFTER = 2500; // ms after load: YouTube starts low and steps up quality, keep that hidden
const MORPH_MS = 700; // expand/collapse of the carousel into cinema mode
// YouTube picks the stream quality from the player's size (setPlaybackQuality / vq are ignored),
// so the player is laid out at 1080p and scaled down to cover its slide with a CSS transform.
const PLAYER_W = 1920;
const PLAYER_H = 1080;

type YtCommand = "mute" | "unMute" | "setVolume" | "playVideo" | "pauseVideo";

/**
 * Apple TV–style carousel: near full-viewport slides with horizontal + vertical parallax.
 * A few seconds after a slide becomes active its muted trailer starts and the carousel itself
 * expands into "cinema" mode: section chrome folds away, slides grow to the full section and
 * only the title, "Dónde verla" and playback controls remain. Parallax keeps working in it.
 */
export function TrailerCarousel({ items }: { items: FeaturedTrailer[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const iframe = useRef<HTMLIFrameElement>(null);
  const broken = useRef(new Set<string>()); // trailer keys YouTube refused to play
  const [active, setActive] = useState(0);
  // Trailer mounted on this slide index / faded in / closed by the user on it.
  const [playingFor, setPlayingFor] = useState<number | null>(null);
  const [visibleFor, setVisibleFor] = useState<number | null>(null);
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);
  // Cinema mode stays on while hopping between trailers, until the user leaves it.
  const [cinemaOn, setCinemaOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(70);
  const [idle, setIdle] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Latest values for callbacks that outlive a render (iframe onLoad timer, scroll handlers).
  const latest = useRef({ sound, volume, active, playingFor, cinemaOn });
  useEffect(() => {
    latest.current = { sound, volume, active, playingFor, cinemaOn };
  }, [sound, volume, active, playingFor, cinemaOn]);

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
    // Slides snap to the start edge (lined up with the section title), so offsets are measured from there.
    const anchor = t.scrollLeft + startPad(t);
    let nearest = 0;
    let best = Infinity;
    slides.current.forEach((el, i) => {
      if (!el) return;
      const o = (el.offsetLeft - anchor) / el.clientWidth;
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

  const playing = inView && playingFor !== null;
  const cinema = playing && cinemaOn;

  /* ---- trailer timer: starts whenever a slide becomes active and visible ---- */
  useEffect(() => {
    if (!inView || reduced || dismissedFor === active || cinemaOn) return;
    const t = setTimeout(() => setPlayingFor(active), VIDEO_DELAY);
    return () => clearTimeout(t);
  }, [active, inView, reduced, dismissedFor, cinemaOn]);

  const goTo = useCallback(
    (i: number) => {
      const t = track.current;
      const el = slides.current[(i + items.length) % items.length];
      if (!t || !el) return;
      t.scrollTo({ left: el.offsetLeft - startPad(t), behavior: "smooth" });
    },
    [items.length],
  );

  const command = useCallback((func: YtCommand, args: unknown[] = []) => {
    iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  /** Next/previous trailer: in cinema it switches the playing trailer right away. */
  const hop = useCallback(
    (d: number) => {
      const from = playingFor ?? active;
      let next = (from + d + items.length) % items.length;
      // skip trailers YouTube already refused to embed
      for (let n = 0; n < items.length && broken.current.has(items[next].trailerKey); n++) next = (next + d + items.length) % items.length;
      if (cinemaOn) {
        setPlayingFor(next);
        setPaused(false);
      }
      goTo(next);
    },
    [playingFor, active, items, cinemaOn, goTo],
  );

  /* ---- swiping in cinema: once the scroll settles, play the slide that landed ---- */
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const onEnd = () => {
      const { cinemaOn: on, active: a, playingFor: p } = latest.current;
      if (on && a !== p) {
        setPlayingFor(a);
        setPaused(false);
      }
    };
    t.addEventListener("scrollend", onEnd);
    return () => t.removeEventListener("scrollend", onEnd);
  }, []);

  /* ---- YouTube player errors (removed / not embeddable / region-blocked videos) ---- */
  // The embed only reports events after a "listening" handshake; on error we move past the video.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname) || e.source !== iframe.current?.contentWindow) return;
      let data: { event?: string } | null = null;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (data?.event !== "onError" || playingFor === null) return;
      broken.current.add(items[playingFor].trailerKey);
      if (cinemaOn) hop(1);
      else {
        setDismissedFor(playingFor);
        setPlayingFor(null);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [playingFor, cinemaOn, hop, items]);

  /** Leave cinema: the carousel folds back while the video fades, then the player unmounts. */
  const exitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const exitCinema = useCallback(() => {
    setDismissedFor(playingFor ?? active);
    setCinemaOn(false);
    setVisibleFor(null);
    setPaused(false);
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setPlayingFor(null), MORPH_MS);
  }, [playingFor, active]);
  useEffect(() => () => clearTimeout(exitTimer.current), []);

  /* ---- auto-advance, unless the user is listening ---- */
  useEffect(() => {
    if (!inView || sound || paused || items.length < 2) return;
    const t = setTimeout(() => hop(1), ADVANCE_AFTER);
    return () => clearTimeout(t);
  }, [active, playingFor, inView, sound, paused, hop, items.length]);

  /* ---- expand / collapse: keep the active slide anchored while widths animate ---- */
  const wasCinema = useRef(cinema);
  useLayoutEffect(() => {
    if (wasCinema.current === cinema) return;
    wasCinema.current = cinema;
    const t = track.current;
    const el = slides.current[latest.current.playingFor ?? latest.current.active];
    if (!t || !el) return;
    t.style.scrollSnapType = "none"; // snapping would fight the per-frame anchoring
    const end = performance.now() + MORPH_MS + 80;
    let raf = 0;
    const step = () => {
      t.scrollLeft = el.offsetLeft - startPad(t);
      paint();
      if (performance.now() < end) raf = requestAnimationFrame(step);
      else t.style.scrollSnapType = "";
    };
    step();
    return () => {
      cancelAnimationFrame(raf);
      t.style.scrollSnapType = "";
    };
  }, [cinema, paint]);

  /* ---- scale the 1080p player to cover its slide (CSS var, no re-render per frame) ---- */
  useEffect(() => {
    if (playingFor === null) return;
    const el = slides.current[playingFor];
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      // 1.15 crops YouTube's own edge chrome
      el.style.setProperty("--fit", String(Math.max(width / PLAYER_W, height / PLAYER_H) * 1.15));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [playingFor]);

  const setMuted = (muted: boolean) => {
    if (muted) command("mute");
    else {
      command("unMute");
      command("setVolume", [volume || 70]);
      if (!volume) setVolume(70);
    }
    setSound(!muted);
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    command("setVolume", [v]);
    if (v === 0 && sound) setMuted(true);
    else if (v > 0 && !sound) {
      command("unMute");
      setSound(true);
    }
  };

  const togglePause = () => {
    command(paused ? "playVideo" : "pauseVideo");
    setPaused((p) => !p);
  };

  /* ---- keyboard while in cinema ---- */
  useEffect(() => {
    if (!cinema) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.key !== "Escape") return;
      if (e.key === "Escape") exitCinema();
      else if (e.key === "ArrowRight") hop(1);
      else if (e.key === "ArrowLeft") hop(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cinema, exitCinema, hop]);

  /* ---- cinema controls fade out while the mouse rests ---- */
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wake = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_AFTER);
  };
  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const watchTrailer = () => {
    clearTimeout(exitTimer.current);
    setDismissedFor(null);
    setSound(true); // explicit click: start with sound
    setPlayingFor(active);
  };

  if (!items.length) return null;

  const morph = "duration-700 ease-out-expo";

  return (
    <section
      ref={section}
      // Title, slides and dots fit in one viewport (below the 4rem sticky header)
      className={cn("relative flex h-[calc(100svh-4rem)] min-h-[600px] flex-col transition-[padding]", morph, cinema ? "py-3 md:py-4" : "py-6 md:py-8")}
      aria-roledescription="carrusel"
      aria-label="Tráilers destacados"
      style={{ "--y": 0 } as React.CSSProperties}
      onPointerMove={cinema ? wake : undefined}
    >
      <Collapse open={!cinema} className={morph}>
        <div className="container-page flex items-end justify-between gap-4 pb-4">
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
      </Collapse>

      <div
        ref={track}
        onScroll={schedule}
        className={cn(
          "no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain md:gap-5",
          ROW_PAD,
          cinema && idle && "cursor-none",
        )}
      >
        {items.map((it, i) => {
          const isActive = i === active;
          const hasPlayer = playing && playingFor === i;
          const shown = hasPlayer && visibleFor === i;
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
              className={cn(
                "relative h-full shrink-0 snap-start overflow-hidden rounded-3xl bg-surface ring-1 ring-white/10 transition-[width]",
                morph,
                cinema ? "w-full" : "w-[88vw] md:w-[84vw]",
              )}
              style={{ "--o": 0, "--fade": i === 0 ? 1 : 0 } as React.CSSProperties}
            >
              {/* backdrop: moves against the swipe and with page scroll */}
              <div
                className="absolute -inset-[10%] will-change-transform"
                style={reduced ? undefined : { transform: "translate3d(calc(var(--o) * -14%), calc(var(--y) * -5%), 0) scale(1.04)" }}
              >
                <Image src={it.media.backdrop_path!} alt="" fill sizes="100vw" priority={i === 0} className="object-cover" />
              </div>

              {/* trailer: 1080p player scaled to cover; fades in over the backdrop once playing */}
              {hasPlayer && (
                <div className={cn("pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000", shown ? "opacity-100" : "opacity-0")}>
                  <iframe
                    ref={iframe}
                    title={`Tráiler de ${it.media.title}`}
                    // Always starts muted (autoplay policy); sound is applied by command so toggling it never reloads the video.
                    src={`https://www.youtube-nocookie.com/embed/${it.trailerKey}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${it.trailerKey}&modestbranding=1&vq=hd1080&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    onLoad={(e) => {
                      const key = it.trailerKey;
                      e.currentTarget.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: key, channel: "widget" }), "*");
                      setTimeout(() => {
                        if (broken.current.has(key) || latest.current.playingFor !== i) return;
                        if (latest.current.sound) {
                          command("unMute");
                          command("setVolume", [latest.current.volume]);
                        }
                        setVisibleFor(i);
                        setCinemaOn(true);
                      }, REVEAL_AFTER);
                    }}
                    className="absolute left-1/2 top-1/2 max-w-none"
                    style={{ width: PLAYER_W, height: PLAYER_H, transform: "translate(-50%, -50%) scale(var(--fit, 1))" }}
                  />
                </div>
              )}

              <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-t from-black to-transparent transition-opacity", morph, cinema ? "via-black/10 opacity-80" : "via-black/30")} />
              <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent transition-opacity", morph, cinema && "opacity-0")} />

              {/* content: drifts slightly faster than the card */}
              <div
                className={cn("absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 transition-[padding]", morph, cinema ? "p-5 md:p-10" : "p-6 md:p-12 lg:p-16")}
                style={reduced ? undefined : { transform: "translate3d(calc(var(--o) * 18%), 0, 0)", opacity: "var(--fade)" }}
              >
                <div className="max-w-xl">
                  <Collapse open={!cinema} className={morph}>
                    <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                      <TypeIcon className="size-3.5" />
                      {it.media.media_type === "movie" ? "Película" : "Serie"}
                    </p>
                  </Collapse>
                  <TrailerTitle item={it} compact={cinema} className={cn("transition-[margin]", morph, cinema ? "mb-4" : "mb-5")} />
                  <Collapse open={!cinema} className={morph}>
                    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
                      {it.media.vote_count >= 20 && <Rating value={it.media.vote_average} votes={it.media.vote_count} className="text-sm" />}
                      {meta.map((m, k) => (
                        <span key={k}>{m}</span>
                      ))}
                    </div>
                    <p className="mb-6 line-clamp-2 max-w-lg text-sm leading-relaxed text-white/75 md:line-clamp-3 md:text-base">{it.media.overview}</p>
                  </Collapse>
                  <div className="flex flex-wrap items-center gap-3">
                    <WhereLink item={it} />
                    {isActive && !cinema && (
                      <button
                        type="button"
                        onClick={watchTrailer}
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20"
                      >
                        <Play className="size-4 fill-current" /> Ver tráiler
                      </button>
                    )}
                  </div>
                </div>

                {isActive && (
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-full border border-white/15 bg-black/45 p-1.5 backdrop-blur-xl transition-opacity duration-500",
                      cinema && !idle ? "opacity-100" : "pointer-events-none opacity-0",
                      cinema && idle && "focus-within:pointer-events-auto focus-within:opacity-100",
                    )}
                    aria-hidden={!cinema}
                    inert={!cinema}
                  >
                    <CinemaButton label="Tráiler anterior" onClick={() => hop(-1)}>
                      <SkipBack className="size-[18px] fill-current" />
                    </CinemaButton>
                    <CinemaButton label={paused ? "Reproducir" : "Pausar"} onClick={togglePause}>
                      {paused ? <Play className="size-[18px] fill-current" /> : <Pause className="size-[18px] fill-current" />}
                    </CinemaButton>
                    <CinemaButton label="Siguiente tráiler" onClick={() => hop(1)}>
                      <SkipForward className="size-[18px] fill-current" />
                    </CinemaButton>
                    <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
                    <CinemaButton label={sound ? "Silenciar" : "Activar sonido"} onClick={() => setMuted(sound)} pressed={sound}>
                      {sound ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
                    </CinemaButton>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={sound ? volume : 0}
                      onChange={(e) => changeVolume(Number(e.target.value))}
                      aria-label="Volumen"
                      className="mr-2 hidden h-1 w-24 cursor-pointer accent-white sm:block"
                    />
                    <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
                    <CinemaButton label="Salir del tráiler (Esc)" onClick={exitCinema}>
                      <Minimize2 className="size-[18px]" />
                    </CinemaButton>
                  </div>
                )}
              </div>

              {/* countdown to the trailer */}
              {isActive && inView && !reduced && !playing && dismissedFor !== i && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                  <div key={active} className="h-full bg-accent" style={{ animation: `trailer-countdown ${VIDEO_DELAY}ms linear forwards` }} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Collapse open={!cinema} className={morph}>
        <div className="flex justify-center gap-2 pt-4" role="tablist" aria-label="Elegir tráiler">
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
      </Collapse>
      <style>{`@keyframes trailer-countdown{from{width:0}to{width:100%}}`}</style>
    </section>
  );
}

/** Height-animated show/hide (grid rows 1fr ↔ 0fr), so surrounding layout moves smoothly. */
function Collapse({ open, className, children }: { open: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn("grid shrink-0 transition-[grid-template-rows,opacity]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0", className)}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function TrailerTitle({ item: it, compact, className }: { item: FeaturedTrailer; compact?: boolean; className?: string }) {
  if (!it.logo) {
    return (
      <h3 className={cn("font-black tracking-tight text-balance transition-[font-size] duration-700 ease-out-expo", compact ? "text-3xl md:text-4xl" : "text-4xl md:text-6xl", className)}>
        {it.media.title}
      </h3>
    );
  }
  return (
    <h3 className={className}>
      <span className="sr-only">{it.media.title}</span>
      <Image
        src={it.logo.file_path}
        alt=""
        width={500}
        height={Math.round(500 / it.logo.aspect_ratio)}
        sizes="(min-width:768px) 440px, 70vw"
        className={cn(
          "h-auto w-auto object-contain object-left drop-shadow-[0_4px_24px_rgb(0_0_0/0.7)] transition-[max-height,max-width] duration-700 ease-out-expo",
          compact ? "max-h-16 max-w-[min(320px,60vw)] md:max-h-24" : "max-h-32 max-w-[min(440px,72vw)] md:max-h-40",
        )}
      />
    </h3>
  );
}

function WhereLink({ item }: { item: FeaturedTrailer }) {
  return (
    <Link
      href={mediaHref(item.media)}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
    >
      <Info className="size-4" /> Dónde verla
    </Link>
  );
}

function CinemaButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="grid size-10 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}
