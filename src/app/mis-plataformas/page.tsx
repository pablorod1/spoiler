import { Suspense } from "react";
import type { Metadata } from "next";
import { getProviders } from "@/lib/tmdb/api";
import { getMyProviderIds } from "@/lib/prefs/server";
import { PlatformPicker } from "@/components/platforms/platform-picker";

export const metadata: Metadata = {
  title: "Mis plataformas",
  description: "Elige tus servicios de streaming y Spoiler te mostrará primero lo que ya puedes ver.",
};

export default function Page() {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Mis plataformas</h1>
        <p className="mt-2 text-muted">
          Marca los servicios que tienes. Personalizaremos la portada, los filtros y te avisaremos en cada ficha cuando algo
          ya esté incluido en tu suscripción.
        </p>
      </header>
      <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
        <Picker />
      </Suspense>
    </main>
  );
}

async function Picker() {
  const [providers, mine] = await Promise.all([getProviders(), getMyProviderIds()]);
  return <PlatformPicker providers={providers.slice(0, 72)} initial={mine} />;
}
