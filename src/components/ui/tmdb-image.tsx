import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/cn";

type Props = Omit<ImageProps, "src"> & {
  path: string | null | undefined;
  fallback?: React.ReactNode;
};

/** next/image wrapper for TMDB paths, with a graceful placeholder. */
export function TmdbImage({ path, fallback, className, alt, ...rest }: Props) {
  if (!path) {
    return (
      <div
        className={cn(
          "absolute inset-0 grid place-items-center bg-gradient-to-br from-surface-2 to-surface-3 p-3 text-center text-xs text-subtle",
          className,
        )}
        aria-label={alt}
      >
        {fallback}
      </div>
    );
  }
  return <Image src={path} alt={alt} className={className} {...rest} />;
}
