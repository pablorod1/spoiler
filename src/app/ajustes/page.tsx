import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getSession } from "@/lib/session";
import { ensureProfile } from "@/lib/social/profile";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Ajustes", robots: { index: false } };

export default function Page() {
  return (
    <main className="container-page pb-10 pt-24 md:pt-28">
      <h1 className="mb-2 text-3xl font-black tracking-tight md:text-4xl">Ajustes</h1>
      <p className="mb-8 text-muted">Así te verán los demás en Whatcher.</p>
      <Suspense fallback={<div className="skeleton h-80 max-w-lg rounded-2xl" />}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const session = await getSession();
  if (!session) redirect("/entrar?volver=/ajustes");
  const p = await ensureProfile(session.user.id);
  if (!p) redirect("/");
  return (
    <>
      <ProfileForm initial={{ username: p.username, name: session.user.name, bio: p.bio ?? "" }} />
      <Link href={`/u/${p.username}`} className="mt-8 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
        Ver mi perfil público <ExternalLink className="size-3.5" />
      </Link>
    </>
  );
}
