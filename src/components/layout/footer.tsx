import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line pb-24 pt-10 md:pb-10">
      <div className="container-page flex flex-col gap-6 text-sm text-subtle md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          <span>Elige qué ver y descubre dónde verlo.</span>
        </div>
        <p className="max-w-xl text-xs leading-relaxed">
          Datos de películas y series de{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline hover:text-fg">TMDB</a>
          . Disponibilidad en plataformas por{" "}
          <a href="https://www.justwatch.com" target="_blank" rel="noreferrer" className="underline hover:text-fg">JustWatch</a>
          . Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.
        </p>
      </div>
    </footer>
  );
}
