import type { Metadata } from "next";
import { ExplorePage } from "@/components/explore/explore-page";

export const metadata: Metadata = {
  title: "Series",
  description: "Todas las series disponibles en España, filtradas a tu gusto.",
};

export default function Page({ searchParams }: PageProps<"/series">) {
  return <ExplorePage type="tv" title="Series" subtitle="Todas las series disponibles en España, filtradas a tu gusto." searchParams={searchParams} />;
}
