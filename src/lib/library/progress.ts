/** Pure helpers shared by server (home, my list) and client (season tracker). */

export interface AiredSeason {
  season: number;
  aired: number;
}

/** First unwatched aired episode after the furthest one watched (specials excluded). */
export function nextEpisode(seasons: AiredSeason[], watched: Set<string>): { season: number; episode: number } | null {
  let furthest: { season: number; episode: number } | null = null;
  for (const k of watched) {
    const [season, episode] = k.split("-").map(Number);
    if (season === 0) continue;
    if (!furthest || season > furthest.season || (season === furthest.season && episode > furthest.episode))
      furthest = { season, episode };
  }
  const ordered = seasons.filter((s) => s.season > 0).sort((a, b) => a.season - b.season);
  for (const s of ordered) {
    for (let e = 1; e <= s.aired; e++) {
      const after = !furthest || s.season > furthest.season || (s.season === furthest.season && e > furthest.episode);
      if (after && !watched.has(`${s.season}-${e}`)) return { season: s.season, episode: e };
    }
  }
  return null;
}
