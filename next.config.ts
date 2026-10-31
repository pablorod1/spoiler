import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/images/tmdb-loader.ts",
    imageSizes: [92, 154, 185, 342, 500],
    deviceSizes: [780, 1280, 1920],
  },
  async redirects() {
    // URLs de la versión Astro
    return [
      { source: "/peliculas/:id(\\d+)", destination: "/pelicula/:id", permanent: true },
      { source: "/series/:id(\\d+)", destination: "/serie/:id", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
