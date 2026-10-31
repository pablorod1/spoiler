import type { Metadata } from "next";
import { ExplorePage } from "@/components/explore/explore-page";

export const metadata: Metadata = {
  title: "Películas",
  description: "Encuentra qué ver filtrando por plataforma, género, época y nota.",
};

export default function Page({ searchParams }: PageProps<"/peliculas">) {
  return <ExplorePage type="movie" title="Películas" subtitle="Encuentra qué ver filtrando por plataforma, género, época y nota." searchParams={searchParams} />;
}
