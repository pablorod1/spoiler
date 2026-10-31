import "server-only";
import { cookies } from "next/headers";
import { PROVIDERS_COOKIE, parseProviderCookie } from "./constants";
import { getUserId } from "@/lib/session";
import { getUserProviderIds } from "@/lib/library/queries";

/**
 * User-selected streaming services: from the account when signed in,
 * otherwise from the device cookie. Request-time: call inside <Suspense>.
 */
export async function getMyProviderIds(): Promise<number[]> {
  const userId = await getUserId();
  if (userId) {
    const ids = await getUserProviderIds(userId);
    if (ids.length) return ids;
  }
  const store = await cookies();
  return parseProviderCookie(store.get(PROVIDERS_COOKIE)?.value);
}
