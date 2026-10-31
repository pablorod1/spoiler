import Link from "next/link";

const EYE = "M16 7C9.6 7 4.6 11.4 2.6 15.2a1.7 1.7 0 0 0 0 1.6C4.6 20.6 9.6 25 16 25s11.4-4.4 13.4-8.2a1.7 1.7 0 0 0 0-1.6C27.4 11.4 22.4 7 16 7z";
const PLAY = "M13.6 12.4c0-.8.9-1.3 1.6-.9l5 3c.7.4.7 1.4 0 1.8l-5 3c-.7.4-1.6-.1-1.6-.9z";

/** An eye whose pupil is a play button: the one who knows what to watch. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <g className="origin-center transition-transform duration-300 ease-out-expo group-hover:scale-y-[0.15]">
        <path d={EYE} fill="var(--accent-fg)" transform="translate(16 16) scale(0.82) translate(-16 -16)" />
        <path d={PLAY} fill="var(--accent)" transform="translate(16 16) scale(0.82) translate(-16 -16)" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2 text-xl font-black tracking-tighter" aria-label="Whatcher, inicio">
      <LogoMark className="size-7 drop-shadow-[0_0_18px_rgb(246_183_60/0.35)]" />
      <span>
        <span className="text-accent">What</span>cher
      </span>
    </Link>
  );
}
