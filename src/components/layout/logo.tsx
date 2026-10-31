import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-1.5 text-xl font-black tracking-tighter" aria-label="pmdb, inicio">
      <span className="grid size-7 place-items-center rounded-lg bg-accent text-[13px] text-accent-fg shadow-[0_0_24px_-4px_var(--accent)] transition group-hover:rotate-[-6deg]">
        ▶
      </span>
      <span>
        pmdb<span className="text-accent">.</span>
      </span>
    </Link>
  );
}
