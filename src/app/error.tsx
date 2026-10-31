"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-page grid min-h-[70vh] place-items-center pt-24 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Algo ha fallado al cargar esta página</h1>
        <p className="mt-2 text-muted">Puede ser un problema temporal con nuestra fuente de datos.</p>
        <button onClick={reset} className="mt-8 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
          Reintentar
        </button>
      </div>
    </main>
  );
}
