"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, CircleCheck, LoaderCircle, Search, ArrowRight } from "lucide-react";
import { saveMyProviders } from "@/lib/prefs/actions";
import type { Provider } from "@/lib/tmdb/types";
import { cn } from "@/lib/cn";

export function PlatformPicker({ providers, initial }: { providers: Provider[]; initial: number[] }) {
  const [selected, setSelected] = useState<number[]>(initial);
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? providers.filter((p) => p.provider_name.toLowerCase().includes(f)) : providers;
  }, [filter, providers]);

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    setSaved(false);
    startTransition(async () => {
      await saveMyProviders(next);
      setSaved(true);
    });
  };

  const chosen = selected.map((id) => providers.find((p) => p.provider_id === id)).filter((p): p is Provider => !!p);

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl md:mx-0 md:rounded-2xl md:border md:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-9 flex-1 items-center gap-1.5">
            {chosen.length ? (
              chosen.map((p) => (
                <button key={p.provider_id} type="button" onClick={() => toggle(p.provider_id)} title={`Quitar ${p.provider_name}`} className="relative size-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/20 transition hover:opacity-70">
                  <Image src={p.logo_path} alt={p.provider_name} fill sizes="36px" />
                </button>
              ))
            ) : (
              <span className="text-sm text-subtle">Aún no has elegido ninguna plataforma</span>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-subtle" aria-live="polite">
            {pending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" /> Guardando…
              </>
            ) : saved ? (
              <>
                <CircleCheck className="size-3.5 text-good" /> Guardado
              </>
            ) : null}
          </span>
          {chosen.length > 0 && (
            <Link href="/peliculas?mias=1" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg hover:brightness-110">
              Ver qué hay <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <label className="mb-5 flex h-11 max-w-sm items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-line-strong">
        <Search className="size-4 text-subtle" />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar plataforma" className="h-full w-full bg-transparent text-sm outline-none placeholder:text-subtle" />
      </label>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((p) => {
          const on = selected.includes(p.provider_id);
          return (
            <li key={p.provider_id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.provider_id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition active:scale-[0.98]",
                  on ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <Image src={p.logo_path} alt="" width={44} height={44} sizes="44px" className="rounded-xl" />
                <span className="min-w-0 flex-1 text-sm font-medium leading-tight">{p.provider_name}</span>
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", on ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
