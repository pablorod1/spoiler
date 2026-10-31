import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DetailPage } from "@/components/detail/detail-page";
import { DetailSkeleton } from "@/components/detail/detail-skeleton";
import { detailMetadata } from "@/lib/tmdb/metadata";
import { parseIdParam } from "@/lib/tmdb/normalize";

export async function generateMetadata({ params }: PageProps<"/pelicula/[id]">) {
  const { id } = await params;
  return detailMetadata("movie", parseIdParam(id));
}

async function Content({ params }: Pick<PageProps<"/pelicula/[id]">, "params">) {
  const id = parseIdParam((await params).id);
  if (!id) notFound();
  return <DetailPage type="movie" id={id} />;
}

export default function Page({ params }: PageProps<"/pelicula/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
