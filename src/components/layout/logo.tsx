import Link from "next/link";

const PICK = "M16 29.5c-1.6 0-3-1-4-2.6C8.6 21.4 4 14.6 4 9.6 4 4.8 9.4 2.5 16 2.5s12 2.3 12 7.1c0 5-4.6 11.8-8 17.3-1 1.6-2.4 2.6-4 2.6z";
const PLAY = "M13.2 8.6c0-.8.9-1.3 1.6-.9l6 3.6c.7.4.7 1.4 0 1.8l-6 3.6c-.7.4-1.6-.1-1.6-.9z";

/** A guitar pick with a play button: pick what to play. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <g className="origin-center transition-transform duration-300 ease-out-expo group-hover:-rotate-12">
        <path d={PICK} fill="var(--accent)" />
        <path d={PLAY} fill="var(--accent-fg)" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-1.5 text-xl font-black tracking-tighter" aria-label="Pickflix, inicio">
      <LogoMark className="size-8 drop-shadow-[0_0_18px_rgb(246_183_60/0.35)]" />
      <span>
        pick<span className="text-accent">flix</span>
      </span>
    </Link>
  );
}
