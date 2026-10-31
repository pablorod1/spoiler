"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Home, Film, Tv, Bookmark, Activity } from "lucide-react";
import { UserMenu } from "./user-menu";
import { Logo } from "./logo";
import { openSearch } from "@/components/search/command-palette";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/peliculas", label: "Películas", icon: Film },
  { href: "/series", label: "Series", icon: Tv },
  { href: "/actividad", label: "Actividad", short: undefined as string | undefined, icon: Activity },
  { href: "/mi-lista", label: "Mi lista", short: undefined as string | undefined, icon: Bookmark },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/peliculas") return pathname.startsWith("/pelicula");
  if (href === "/series") return pathname.startsWith("/serie");
  return pathname.startsWith(href);
}

function DesktopLinks({ pathname }: { pathname: string | null }) {
  return NAV.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        pathname && isActive(pathname, item.href) ? "bg-white/10 text-white" : "text-muted hover:text-fg",
      )}
    >
      {item.label}
    </Link>
  ));
}

function MobileLinks({ pathname }: { pathname: string | null }) {
  return NAV.map(({ href, label, short, icon: Icon }) => (
    <li key={href}>
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
          pathname && isActive(pathname, href) ? "text-accent" : "text-subtle",
        )}
      >
        <Icon className="size-5" />
        {short ?? label}
      </Link>
    </li>
  ));
}

/** usePathname is URL data: keep it behind Suspense so routes stay prerenderable. */
function WithPathname({ render }: { render: (p: string | null) => React.ReactNode }) {
  return <Suspense fallback={render(null)}><PathnameReader render={render} /></Suspense>;
}
function PathnameReader({ render }: { render: (p: string | null) => React.ReactNode }) {
  return render(usePathname());
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
          scrolled
            ? "border-b border-line bg-bg/80 backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-black/70 to-transparent",
        )}
      >
        <div className="container-page flex h-16 items-center gap-3 md:gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex md:-ml-4" aria-label="Principal">
            <WithPathname render={(p) => <DesktopLinks pathname={p} />} />
          </nav>
          <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={openSearch}
            className="flex h-10 items-center gap-2.5 rounded-full border border-line bg-white/5 pl-3.5 pr-2 text-sm text-muted backdrop-blur-md transition hover:border-line-strong hover:text-fg md:w-72"
            aria-label="Buscar"
          >
            <Search className="size-4" />
            <span className="hidden md:inline">Buscar títulos, personas…</span>
            <kbd className="ml-auto hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] md:block">⌘K</kbd>
          </button>
          <UserMenu />
          </div>
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Principal móvil"
      >
        <ul className="grid grid-cols-5">
          <WithPathname render={(p) => <MobileLinks pathname={p} />} />
        </ul>
      </nav>
    </>
  );
}
