"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { deleteList, removeFromList, updateList } from "@/lib/social/actions";
import { cn } from "@/lib/cn";

export function ShareButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.origin + path;
        if (navigator.share) await navigator.share({ url }).catch(() => {});
        else {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-2"
    >
      {copied ? <Check className="size-4 text-good" /> : <Link2 className="size-4" />}
      {copied ? "Enlace copiado" : "Compartir"}
    </button>
  );
}

export function ListEditor({
  id,
  initial,
  username,
}: {
  id: string;
  initial: { title: string; description: string; isPublic: boolean };
  username: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-2">
        <Pencil className="size-4" /> Editar
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <form
        className="w-full max-w-md space-y-4 rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await updateList(id, form);
            if (!res.ok) return setError(res.error);
            setOpen(false);
            router.refresh();
          });
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar lista</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-muted hover:text-fg">
            <X className="size-5" />
          </button>
        </div>
        <input
          value={form.title}
          maxLength={80}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
          placeholder="Nombre"
        />
        <textarea
          value={form.description}
          maxLength={500}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="min-h-24 w-full rounded-xl border border-line bg-surface-2 p-3 text-sm outline-none focus:border-accent"
          placeholder="Descripción (opcional)"
        />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="size-4 accent-[var(--accent)]" />
          Pública (cualquiera con el enlace y en tu perfil)
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              if (!confirm("¿Borrar esta lista? No se puede deshacer.")) return;
              start(async () => {
                await deleteList(id);
                router.replace(`/u/${username}?tab=listas`);
              });
            }}
            className="inline-flex items-center gap-1.5 text-sm text-bad hover:underline"
          >
            <Trash2 className="size-4" /> Borrar lista
          </button>
          <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg disabled:opacity-60">
            {pending && <LoaderCircle className="size-4 animate-spin" />} Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

export function RemoveItemButton({ listId, mediaType, tmdbId }: { listId: string; mediaType: "movie" | "tv"; tmdbId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Quitar de la lista"
      onClick={() =>
        start(async () => {
          await removeFromList(listId, { mediaType, tmdbId });
          router.refresh();
        })
      }
      className={cn(
        "absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/75 text-white opacity-0 backdrop-blur transition hover:bg-bad group-hover/item:opacity-100 focus:opacity-100",
        pending && "opacity-100",
      )}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <X className="size-4" />}
    </button>
  );
}
