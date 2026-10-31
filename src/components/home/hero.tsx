"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Info, Film, Tv } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { mediaHref } from "@/lib/tmdb/normalize";
import { year } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { HeroItem } from "@/lib/tmdb/api";

const INTERVAL = 9000;

export function Hero({ items, genreNames }: { items: HeroItem[]; genreNames: Record<number, string> }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % items.length), INTERVAL);
    return () => clearTimeout(t);
  }, [index, paused, items.length]);

  if (!items.length) return null;
  const current = items[index];

  return (
    <section
      className="relative h-[78svh] min-h-[520px] w-full overflow-hidden md:h-[88svh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrusel"
      aria-label="Destacados de la semana"
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-out-expo",
            i === index ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <Image
            src={item.backdrop_path!}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover object-[center_20%] transition-transform duration-[12s] ease-linear",
              i === index ? "scale-105" : "scale-100",
            )}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-black/30" />

      <div className="container-page relative flex h-full flex-col justify-end pb-16 md:pb-24">
        <div key={current.id} className="max-w-xl animate-fade-up">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-accent" />
            Tendencia esta semana · #{index + 1}
          </p>
          {current.logo ? (
            <h1 className="mb-5">
              <span className="sr-only">{current.title}</span>
              <Image
                src={current.logo.file_path}
                alt=""
                width={500}
                height={Math.round(500 / current.logo.aspect_ratio)}
                sizes="(min-width:768px) 420px, 70vw"
                className="h-auto max-h-36 w-auto max-w-[min(420px,75vw)] object-contain object-left drop-shadow-[0_4px_24px_rgb(0_0_0/0.6)]"
              />
            </h1>
          ) : (
            <h1 className="mb-4 text-4xl font-black tracking-tight text-balance md:text-6xl">{current.title}</h1>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
            <Rating value={current.vote_average} votes={current.vote_count} className="text-sm" />
            <span className="inline-flex items-center gap-1">
              {current.media_type === "movie" ? <Film className="size-3.5" /> : <Tv className="size-3.5" />}
              {current.media_type === "movie" ? "Película" : "Serie"}
            </span>
            {current.date && <span>{year(current.date)}</span>}
            {current.genre_ids.slice(0, 3).map((g) =>
              genreNames[g] ? (
                <span key={g} className="text-white/60">
                  {genreNames[g]}
                </span>
              ) : null,
            )}
          </div>
          <p className="mb-7 line-clamp-3 max-w-lg text-base leading-relaxed text-white/75 text-pretty">
            {current.overview}
          </p>
          <div className="flex gap-3">
            <Link
              href={mediaHref(current)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
            >
              <Info className="size-4" />
              Dónde verla y más
            </Link>
          </div>
        </div>

        <div className="mt-10 flex gap-2" role="tablist" aria-label="Elegir destacado">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={item.title}
              onClick={() => setIndex(i)}
              className="group relative h-1 w-10 overflow-hidden rounded-full bg-white/20 md:w-14"
            >
              <span
                key={`${index}-${paused}`}
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full bg-white",
                  i <= index ? "w-full" : "w-0",
                  i < index && "opacity-60",
                )}
                style={
                  i === index && !paused
                    ? { animation: `hero-progress ${INTERVAL}ms linear both` }
                    : undefined
                }
              />
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes hero-progress{from{width:0}to{width:100%}}`}</style>
    </section>
  );
}
