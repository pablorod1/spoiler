"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { updateProfile } from "@/lib/social/actions";
import { validateUsername } from "@/lib/social/username";

export function ProfileForm({ initial }: { initial: { username: string; name: string; bio: string } }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const usernameError = form.username !== initial.username ? validateUsername(form.username) : null;

  const field = "h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition placeholder:text-subtle focus:border-accent";

  return (
    <form
      className="max-w-lg space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        start(async () => {
          const res = await updateProfile(form);
          if (!res.ok) return setError(res.error);
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Nombre</span>
        <input className={field} value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Nombre de usuario</span>
        <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-accent">
          <span className="pl-4 text-subtle">@</span>
          <input
            className="h-12 w-full bg-transparent px-1 text-[15px] outline-none"
            value={form.username}
            maxLength={20}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
          />
        </div>
        <span className={`mt-1.5 block text-xs ${usernameError ? "text-bad" : "text-subtle"}`}>
          {usernameError ?? `Tu perfil: whatcher.vercel.app/u/${form.username || "…"}`}
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Bio</span>
        <textarea
          className="min-h-28 w-full rounded-xl border border-line bg-surface p-4 text-[15px] outline-none transition placeholder:text-subtle focus:border-accent"
          value={form.bio}
          maxLength={280}
          placeholder="Fan del cine coreano, maratones de fin de semana…"
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
        <span className="mt-1 block text-right text-xs text-subtle">{form.bio.length}/280</span>
      </label>
      {error && <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || Boolean(usernameError)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg transition hover:brightness-110 disabled:opacity-50"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" />} Guardar
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-good">
            <CircleCheck className="size-4" /> Guardado
          </span>
        )}
      </div>
    </form>
  );
}
