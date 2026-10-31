import { cn } from "@/lib/cn";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="skeleton aspect-[2/3] rounded-xl" />
      <div className="skeleton mt-3 h-3.5 w-4/5 rounded" />
      <div className="skeleton mt-2 h-3 w-1/3 rounded" />
    </div>
  );
}

export function RailSkeleton({ title = true }: { title?: boolean }) {
  return (
    <section className="container-page py-6" aria-busy>
      {title && <div className="skeleton mb-4 h-6 w-56 rounded" />}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <CardSkeleton key={i} className="w-[42%] shrink-0 sm:w-[28%] md:w-[20%] lg:w-[15%] xl:w-[12.5%]" />
        ))}
      </div>
    </section>
  );
}

export function GridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
