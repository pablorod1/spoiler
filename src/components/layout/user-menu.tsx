"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, LogOut, MonitorPlay, Settings, UserRound } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const { data, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (isPending) return <div className="size-10 shrink-0 rounded-full bg-white/5" />;

  if (!data) {
    return (
      <Link
        href="/entrar"
        className="inline-flex h-10 shrink-0 items-center rounded-full bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
      >
        Entrar
      </Link>
    );
  }

  const { user } = data;
  const initial = (user.name || user.email).trim()[0]?.toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tu cuenta"
        className="grid size-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-orange-500 text-sm font-bold text-accent-fg ring-2 ring-transparent transition hover:ring-white/30"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-line-strong bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl animate-fade-up"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-subtle">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          {[
            { href: "/perfil", label: "Mi perfil", icon: UserRound },
            { href: "/mi-lista", label: "Mi lista", icon: Bookmark },
            { href: "/mis-plataformas", label: "Mis plataformas", icon: MonitorPlay },
            { href: "/ajustes", label: "Ajustes", icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-3 hover:text-fg"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await signOut();
              setOpen(false);
              router.refresh();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-3 hover:text-fg"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

