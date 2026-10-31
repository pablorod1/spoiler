import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ensureProfile } from "@/lib/social/profile";

/** /perfil -> /u/<username> of the signed-in user */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Go />
    </Suspense>
  );
}

async function Go(): Promise<React.ReactNode> {
  const session = await getSession();
  if (!session) redirect("/entrar?volver=/perfil");
  const p = await ensureProfile(session.user.id);
  redirect(p ? `/u/${p.username}` : "/");
}
