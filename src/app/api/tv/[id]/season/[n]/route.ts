import { getSeasonEpisodes } from "@/lib/tmdb/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/tv/[id]/season/[n]">) {
  const { id, n } = await ctx.params;
  const tvId = Number.parseInt(id, 10);
  const season = Number.parseInt(n, 10);
  if (!(tvId > 0) || !(season >= 0)) return Response.json({ error: "invalid" }, { status: 400 });
  const episodes = await getSeasonEpisodes(tvId, season);
  return Response.json(
    episodes.map((e) => ({
      episode_number: e.episode_number,
      name: e.name,
      air_date: e.air_date,
      runtime: e.runtime,
      still_path: e.still_path,
    })),
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
