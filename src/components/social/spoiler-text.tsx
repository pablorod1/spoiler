"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

export function SpoilerText({ text, spoiler, clamp = true }: { text: string; spoiler: boolean; clamp?: boolean }) {
  const [revealed, setRevealed] = useState(!spoiler);
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 320;

  return (
    <div className="relative">
      <p
        className={cn(
          "whitespace-pre-line text-sm leading-relaxed text-fg/85 transition",
          !revealed && "pointer-events-none select-none blur-md",
          clamp && long && !expanded && "line-clamp-5",
        )}
        aria-hidden={!revealed}
      >
        {text}
      </p>
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 m-auto flex h-9 w-fit items-center gap-2 rounded-full border border-line-strong bg-surface/90 px-4 text-xs font-semibold backdrop-blur"
        >
          <EyeOff className="size-3.5" /> Contiene spoilers · Mostrar
        </button>
      )}
      {revealed && clamp && long && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 text-xs font-medium text-accent">
          {expanded ? "Ver menos" : "Leer más"}
        </button>
      )}
    </div>
  );
}
