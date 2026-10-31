import Link from "next/link";

/** The mark is a "redacted" card: two hidden lines of text — the spoiler. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <rect x="7" y="10.5" width="18" height="4.5" rx="2.25" fill="var(--accent-fg)" className="origin-left transition-transform duration-300 group-hover:scale-x-[0.55]" />
      <rect x="7" y="18" width="11" height="4.5" rx="2.25" fill="var(--accent-fg)" className="origin-left transition-transform duration-300 group-hover:scale-x-150" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2 text-xl font-black tracking-tighter" aria-label="Spoiler, inicio">
      <LogoMark className="size-7 drop-shadow-[0_0_18px_rgb(246_183_60/0.35)]" />
      <span>
        spoiler<span className="text-accent">.</span>
      </span>
    </Link>
  );
}
