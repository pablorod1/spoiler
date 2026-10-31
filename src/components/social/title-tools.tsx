"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ListPlus, LoaderCircle, Lock, MessageSquareText, Plus, X } from "lucide-react";
import { addToList, createList, removeFromList } from "@/lib/social/actions";
import { saveReview } from "@/lib/library/actions";
import type { MediaSnapshot } from "@/lib/library/types";
import { cn } from "@/lib/cn";

const pill =
  "inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20";

export function AddToList({
  media,
  lists: initialLists,
  loginHref,
}: {
  media: MediaSnapshot;
  lists: { id: string; title: string; isPublic: boolean; contains: boolean }[];
  loginHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(initialLists);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (id: string, contains: boolean) => {
    setLists((ls) => ls.map((l) => (l.id === id ? { ...l, contains: !contains } : l)));
    start(async () => {
      const res = contains ? await removeFromList(id, media) : await addToList(id, media);
      if (!res.ok) setLists((ls) => ls.map((l) => (l.id === id ? { ...l, contains } : l)));
    });
  };

  const create = () => {
    if (!title.trim()) return;
    start(async () => {
      const res = await createList({ title }, media);
      if (res.ok) {
        setLists((ls) => [{ id: res.id, title: title.trim(), isPublic: true, contains: true }, ...ls]);
        setTitle("");
        setCreating(false);
        router.refresh();
      }
    });
  };

  const inCount = lists.filter((l) => l.contains).length;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => (loginHref ? router.push(loginHref) : setOpen((o) => !o))} aria-expanded={open} className={pill}>
        <ListPlus className="size-4" />
        {inCount ? `En ${inCount} ${inCount === 1 ? "lista" : "listas"}` : "Añadir a lista"}
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-30 w-72 overflow-hidden rounded-2xl border border-line-strong bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <ul className="max-h-64 overflow-y-auto">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => toggle(l.id, l.contains)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-3"
                >
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", l.contains ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>
                    {l.contains && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.title}</span>
                  {!l.isPublic && <Lock className="size-3.5 text-subtle" />}
                </button>
              </li>
            ))}
          </ul>
          {lists.length > 0 && <div className="my-1 h-px bg-line" />}
          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create();
              }}
              className="flex items-center gap-2 p-1.5"
            >
              <input
                autoFocus
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre de la lista"
                className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none focus:border-accent"
              />
              <button type="submit" disabled={pending} className="grid size-9 place-items-center rounded-lg bg-accent text-accent-fg disabled:opacity-60" aria-label="Crear">
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-accent hover:bg-surface-3">
              <Plus className="size-4" /> Nueva lista
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewButton({
  media,
  initial,
  loginHref,
}: {
  media: MediaSnapshot;
  initial: { review: string | null; spoiler: boolean };
  loginHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial.review ?? "");
  const [spoiler, setSpoiler] = useState(initial.spoiler);
  const [has, setHas] = useState(Boolean(initial.review));
  const [pending, start] = useTransition();

  const save = (value: string | null) =>
    start(async () => {
      const res = await saveReview(media, value, spoiler);
      if (res.ok) {
        setHas(Boolean(value?.trim()));
        if (!value) setText("");
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <>
      <button type="button" onClick={() => (loginHref ? router.push(loginHref) : setOpen(true))} className={cn(pill, has && "border-accent/50 text-accent")}>
        <MessageSquareText className="size-4" />
        {has ? "Tu reseña" : "Escribir reseña"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(text);
            }}
            className="w-full max-w-xl space-y-4 rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Reseña de {media.title}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-muted hover:text-fg">
                <X className="size-5" />
              </button>
            </div>
            <textarea
              autoFocus
              value={text}
              maxLength={5000}
              onChange={(e) => setText(e.target.value)}
              placeholder="¿Qué te ha parecido?"
              className="min-h-48 w-full rounded-xl border border-line bg-surface-2 p-4 text-[15px] leading-relaxed outline-none focus:border-accent"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                Contiene spoilers (se mostrará oculta)
              </label>
              <span className="text-xs text-subtle">{text.length}/5000</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              {has ? (
                <button type="button" onClick={() => save(null)} className="text-sm text-bad hover:underline">
                  Borrar reseña
                </button>
              ) : (
                <span />
              )}
              <button type="submit" disabled={pending || !text.trim()} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg disabled:opacity-50">
                {pending && <LoaderCircle className="size-4 animate-spin" />} Publicar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
