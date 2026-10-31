export function DetailSkeleton() {
  return (
    <div className="container-page grid gap-8 pb-16 pt-24 md:grid-cols-[260px_1fr] md:gap-12 md:pt-32 lg:grid-cols-[300px_1fr]" aria-busy>
      <div className="skeleton mx-auto aspect-[2/3] w-48 rounded-2xl md:w-full" />
      <div className="flex flex-col justify-end gap-4">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-12 w-3/4 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-20 w-full max-w-3xl rounded" />
        <div className="skeleton h-11 w-40 rounded-full" />
      </div>
    </div>
  );
}
