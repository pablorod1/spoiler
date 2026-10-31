import { cn } from "@/lib/cn";

const GRADIENTS = [
  "from-amber-400 to-orange-600",
  "from-rose-400 to-fuchsia-600",
  "from-sky-400 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-700",
  "from-lime-400 to-green-600",
];

export function Avatar({
  user,
  size = 36,
  className,
}: {
  user: { name: string; username?: string; image: string | null };
  size?: number;
  className?: string;
}) {
  const seed = (user.username ?? user.name).split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  const initial = (user.name || user.username || "?").trim()[0]?.toUpperCase();
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white ring-1 ring-white/10",
        GRADIENTS[seed % GRADIENTS.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initial
      )}
    </span>
  );
}
