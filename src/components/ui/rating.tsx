import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRating, ratingTone } from "@/lib/format";

const tones = {
  good: "text-good",
  mid: "text-mid",
  bad: "text-bad",
  none: "text-subtle",
};

export function Rating({
  value,
  votes,
  className,
  size = "sm",
}: {
  value: number;
  votes?: number;
  className?: string;
  size?: "sm" | "lg";
}) {
  const tone = ratingTone(value, votes);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold tabular-nums",
        size === "lg" ? "text-lg" : "text-xs",
        tones[tone],
        className,
      )}
      title={votes ? `${votes.toLocaleString("es-ES")} votos en TMDB` : undefined}
    >
      <Star className={cn("fill-current", size === "lg" ? "size-5" : "size-3")} aria-hidden />
      {tone === "none" ? "–" : formatRating(value)}
    </span>
  );
}
