/** Brand-inspired colours for the platform showcases (fallback: app accent). */
const THEMES: Record<number, { color: string; tint: string }> = {
  8: { color: "#e50914", tint: "#3a0306" }, // Netflix
  1796: { color: "#e50914", tint: "#3a0306" }, // Netflix with ads
  119: { color: "#1aa3ff", tint: "#04223a" }, // Prime Video
  337: { color: "#2f6bff", tint: "#07123d" }, // Disney+
  1899: { color: "#7b3cff", tint: "#1c0b44" }, // Max
  350: { color: "#e5e5ea", tint: "#202024" }, // Apple TV
  2241: { color: "#19b5ff", tint: "#032a3d" }, // Movistar Plus+
  149: { color: "#19b5ff", tint: "#032a3d" }, // Movistar Plus+ Ficción Total
  1773: { color: "#ff3d8b", tint: "#3d0820" }, // SkyShowtime
  63: { color: "#ff4f6d", tint: "#3d0c15" }, // Filmin
  64: { color: "#ff4f6d", tint: "#3d0c15" }, // Filmin Plus
  62: { color: "#ff6a13", tint: "#3d1803" }, // Atresplayer
  11: { color: "#4b7bff", tint: "#0b1640" }, // MUBI
  35: { color: "#bf0000", tint: "#330000" }, // Rakuten TV
  393: { color: "#f5a623", tint: "#3d2802" }, // FlixOlé
  223: { color: "#ff4fa3", tint: "#3d0c27" }, // Hayu
  283: { color: "#ff7a1a", tint: "#3d1d06" }, // Crunchyroll
};

export function providerTheme(id: number) {
  return THEMES[id] ?? { color: "#f6b73c", tint: "#3a2a0b" };
}
