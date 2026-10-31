"use client";

const SIZES = [92, 154, 185, 342, 500, 780, 1280] as const;

/**
 * next/image loader that maps requested widths to TMDB's pre-rendered sizes.
 * TMDB already serves optimised images from its CDN, so we skip Next's optimiser.
 * `src` is a TMDB file path ("/abc.jpg") or an absolute URL.
 */
export default function tmdbLoader({ src, width }: { src: string; width: number }) {
  if (/^https?:\/\//.test(src) || !src.startsWith("/") || src.startsWith("/_next")) return src;
  const size = SIZES.find((s) => s >= width);
  return `https://image.tmdb.org/t/p/${size ? `w${size}` : "original"}${src}`;
}
