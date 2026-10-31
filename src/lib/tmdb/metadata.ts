import type { Metadata } from "next";
import { getDetails } from "./api";
import { mediaHref } from "./normalize";
import { year } from "@/lib/format";
import type { MediaType } from "./types";

export async function detailMetadata(type: MediaType, id: number | null): Promise<Metadata> {
  const m = id ? await getDetails(type, id) : null;
  if (!m) return { title: "No encontrado" };
  const kind = type === "movie" ? "película" : "serie";
  const title = `${m.title}${m.date ? ` (${year(m.date)})` : ""}`;
  const description =
    `Dónde ver ${m.title} en España: plataformas, tráiler, reparto y nota. ` + (m.overview ?? "").slice(0, 140);
  return {
    title,
    description,
    alternates: { canonical: mediaHref(m) },
    openGraph: {
      title: `${title} — ${kind} · Pickflix`,
      description,
      images: m.backdrop_path ? [`https://image.tmdb.org/t/p/w1280${m.backdrop_path}`] : undefined,
    },
  };
}
