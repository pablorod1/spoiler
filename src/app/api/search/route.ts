import { type NextRequest } from "next/server";
import { search } from "@/lib/tmdb/api";
import { searchUsers } from "@/lib/social/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 100) ?? "";
  const [results, users] = await Promise.all([search(q), searchUsers(q, 3).catch(() => [])]);
  return Response.json(
    {
      media: results.media.slice(0, 8),
      people: results.people.slice(0, 4),
      users,
    },
    { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
