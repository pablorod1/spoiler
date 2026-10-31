"use client";

import { useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function TrailerButton({
  videoKey,
  title,
  variant = "primary",
  label = "Ver tráiler",
  className,
}: {
  videoKey: string;
  title: string;
  variant?: "primary" | "ghost";
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    setOpen(true);
    ref.current?.showModal();
  };
  const close = () => {
    ref.current?.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-[0.98]",
          variant === "primary"
            ? "bg-white text-black hover:bg-white/90"
            : "border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
          className,
        )}
      >
        <Play className="size-4 fill-current" />
        {label}
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[min(1100px,94vw)] overflow-visible bg-transparent p-0 backdrop:bg-black/80"
        aria-label={`Tráiler de ${title}`}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
          {open && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
              title={`Tráiler de ${title}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </dialog>
    </>
  );
}
