import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page grid min-h-[70vh] place-items-center pt-24 text-center">
      <div>
        <p className="text-8xl font-black tracking-tighter text-accent">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Esta escena se quedó en la sala de montaje</h1>
        <p className="mt-2 text-muted">No encontramos lo que buscas.</p>
        <Link href="/" className="mt-8 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
