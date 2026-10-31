import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bookmark, CircleCheck, Star, Tv } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { LogoMark } from "@/components/layout/logo";
import { googleEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

const PERKS = [
  { icon: Bookmark, text: "Guarda lo que quieres ver y te avisamos cuando llegue a tus plataformas" },
  { icon: Tv, text: "Lleva tus series al día, episodio a episodio" },
  { icon: Star, text: "Valora lo que ves y mejora tus recomendaciones" },
  { icon: CircleCheck, text: "Tus plataformas y tu lista, en todos tus dispositivos" },
];

export default function Page({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="container-page grid min-h-[85vh] items-center gap-12 pb-10 pt-24 md:grid-cols-2 md:pt-28">
      <section className="hidden md:block">
        <LogoMark className="mb-6 size-12" />
        <h1 className="text-4xl font-black tracking-tight text-balance lg:text-5xl">
          Spoiler: <span className="text-accent">ya sabes qué ver.</span>
        </h1>
        <ul className="mt-8 space-y-4">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-muted">
              <Icon className="mt-0.5 size-5 shrink-0 text-accent" />
              {text}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col items-center">
        <h1 className="mb-6 text-2xl font-black tracking-tight md:hidden">Entra en Spoiler</h1>
        <Suspense fallback={<div className="skeleton h-80 w-full max-w-sm rounded-2xl" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const raw = (await searchParams).volver;
  const volver = Array.isArray(raw) ? raw[0] : raw;
  if (await getSession()) redirect(volver?.startsWith("/") && !volver.startsWith("//") ? volver : "/");
  return <AuthForm redirectTo={volver} googleEnabled={googleEnabled} />;
}
