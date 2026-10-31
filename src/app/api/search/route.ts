import { type NextRequest } from "next/server";
import { search } from "@/lib/tmdb/api";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 100) ?? "";
  const results = await search(q);
  return Response.json(
    {
      media: results.media.slice(0, 8),
      people: results.people.slice(0, 4),
    },
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
