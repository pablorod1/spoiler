"use client";

import { Children, useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Horizontal, snap-scrolling rail with keyboard-accessible arrows. */
export function Rail({
  title,
  eyebrow,
  href,
  icon,
  children,
  itemClassName = "w-[42%] sm:w-[28%] md:w-[20%] lg:w-[15%] xl:w-[12.5%]",
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  itemClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const items = Children.toArray(children);
  if (!items.length) return null;

  return (
    <section className="group/rail relative py-5">
      <div className="container-page mb-3 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-widest text-accent">{eyebrow}</p>}
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight md:text-xl">
            {icon}
            {href ? (
              <Link href={href} className="group/title inline-flex items-center gap-1.5 hover:text-white">
                {title}
                <ArrowRight className="size-4 -translate-x-1 text-muted opacity-0 transition group-hover/title:translate-x-0 group-hover/title:opacity-100" />
              </Link>
            ) : (
              title
            )}
          </h2>
        </div>
        <div className="hidden gap-1.5 md:flex">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => scroll(d as 1 | -1)}
              disabled={d === -1 ? edges.start : edges.end}
              aria-label={d === -1 ? "Anterior" : "Siguiente"}
              className="grid size-8 place-items-center rounded-full border border-line bg-surface/80 text-muted transition hover:border-line-strong hover:text-fg disabled:opacity-30"
            >
              {d === -1 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        onScroll={update}
        className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4 pt-1 md:scroll-px-8 md:gap-4 md:px-8 xl:scroll-px-12 xl:px-12 [@media(min-width:1440px)]:px-[calc((100vw-1440px)/2+3rem)]"
      >
        {items.map((child, i) => (
          <div key={i} className={cn("shrink-0 snap-start", itemClassName)}>
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}
