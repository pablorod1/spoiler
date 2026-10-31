import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Brand mark: golden "W" with clapperboard and play (public/brand/logo-mark.png, 512×314). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={512}
      height={314}
      unoptimized
      priority
      className={cn("h-7 w-auto select-none transition-transform duration-300 ease-out-expo group-hover:-rotate-3 group-hover:scale-105", className)}
    />
  );
}

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2 text-xl font-black tracking-tighter" aria-label="Whatcher, inicio">
      <LogoMark className="drop-shadow-[0_0_14px_rgb(246_183_60/0.35)]" />
      <span>
        <span className="text-accent">What</span>cher
      </span>
    </Link>
  );
}
