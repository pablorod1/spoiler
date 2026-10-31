import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

/** Current session (request-time: call inside <Suspense>). Deduped per request. */
export const getSession = cache(async () => {
  const h = await headers();
  // Better Auth checks expiry with Date.now(): keep it out of prerenders/prefetches.
  await connection();
  return auth.api.getSession({ headers: h });
});

export async function getUserId(): Promise<string | null> {
  return (await getSession())?.user.id ?? null;
}
