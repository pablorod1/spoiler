import { type NextRequest } from "next/server";
import { discover } from "@/lib/tmdb/api";
import { parseExplore, toDiscover } from "@/lib/explore";
import { getMyProviderIds } from "@/lib/prefs/server";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("tipo") === "tv" ? "tv" : "movie";
  const page = Math.min(Math.max(Number.parseInt(sp.get("page") ?? "1", 10) || 1, 1), 500);
  const state = parseExplore(sp);
  const mine = state.mine ? await getMyProviderIds() : [];
  const data = await discover(toDiscover(type, state, mine, page));
  return Response.json(data, {
    headers: { "cache-control": state.mine ? "private, max-age=300" : "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
