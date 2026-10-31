# Spoiler

**Spoiler: ya sabes qué ver.** Qué ver, dónde verlo y por qué te va a gustar. Descubre películas y series, mira en qué plataformas están en España y filtra todo por **tus** servicios de streaming.

## Stack

- **Next.js 16** (App Router, Cache Components + Partial Prefetching), React 19, TypeScript
- **Tailwind CSS v4** con tokens de diseño en `src/app/globals.css`
- Datos de **TMDB** (disponibilidad por JustWatch vía TMDB), solo desde el servidor y con caché (`'use cache'`)
- Imágenes servidas desde el CDN de TMDB mediante un loader de `next/image` (`src/lib/images/tmdb-loader.ts`)

## Desarrollo

```sh
cp .env.example .env.local   # añade tu TMDB_READ_TOKEN o TMDB_API_KEY
pnpm install
pnpm dev
```

## Estructura

```
src/
  app/                    rutas (/, /peliculas, /series, /pelicula/[id], /serie/[id],
                          /persona/[id], /buscar, /mis-plataformas, /api/*)
  components/
    layout/               cabecera, tab bar móvil, footer
    home/ media/ detail/  hero, tarjetas, carriles, fichas
    explore/              filtros + grid con scroll infinito
    search/               paleta de búsqueda (⌘K / "/")
    platforms/            selector de "Mis plataformas"
  lib/
    tmdb/                 cliente, normalización y consultas cacheadas
    prefs/                preferencias del usuario (cookie + server action)
    explore.ts            estado de filtros <-> URL compartible
```

## Roadmap

- [x] Fase 1 — nueva arquitectura, rediseño, Mis plataformas, explorador, fichas, personas, búsqueda
- [ ] Fase 2 — cuentas (Better Auth + Turso/Drizzle): watchlist, vistas, valoraciones, seguimiento de series por episodio
- [ ] Fase 3 — social: listas públicas, amigos, feed, reseñas
- [ ] Fase 4 — alertas (llega/se va de tu plataforma), recomendaciones personalizadas, búsqueda en lenguaje natural, "¿qué vemos esta noche?" en grupo
