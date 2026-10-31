import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PersonPage } from "@/components/detail/person-page";
import { DetailSkeleton } from "@/components/detail/detail-skeleton";
import { getPerson } from "@/lib/tmdb/api";
import { parseIdParam, personHref } from "@/lib/tmdb/normalize";

export async function generateMetadata({ params }: PageProps<"/persona/[id]">): Promise<Metadata> {
  const id = parseIdParam((await params).id);
  const p = id ? await getPerson(id) : null;
  if (!p) return { title: "No encontrado" };
  return {
    title: p.name,
    description: `Películas y series de ${p.name}: filmografía completa, biografía y dónde verlas.`,
    alternates: { canonical: personHref(p) },
  };
}

async function Content({ params }: Pick<PageProps<"/persona/[id]">, "params">) {
  const id = parseIdParam((await params).id);
  if (!id) notFound();
  return <PersonPage id={id} />;
}

export default function Page({ params }: PageProps<"/persona/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
