import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Provider } from "@/lib/tmdb/types";

export function ProviderLogo({
  provider,
  size = 40,
  className,
}: {
  provider: Pick<Provider, "logo_path" | "provider_name">;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={provider.logo_path}
      alt={provider.provider_name}
      title={provider.provider_name}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn("shrink-0 rounded-[22%] ring-1 ring-white/10", className)}
    />
  );
}
