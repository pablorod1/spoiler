import "server-only";
import { cookies } from "next/headers";
import { PROVIDERS_COOKIE, parseProviderCookie } from "./constants";

/** User-selected streaming services. Request-time: call inside <Suspense>. */
export async function getMyProviderIds(): Promise<number[]> {
  const store = await cookies();
  return parseProviderCookie(store.get(PROVIDERS_COOKIE)?.value);
}
