export const PROVIDERS_COOKIE = "whatcher_providers";

/** Sensible defaults for Spain when the user hasn't picked yet */
export const DEFAULT_PROVIDER_IDS = [8, 119, 337, 1899, 350, 2241, 1773, 63] // Netflix, Prime, Disney+, Max, Apple TV, Movistar Plus+, SkyShowtime, Filmin;

export function parseProviderCookie(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(".")
    .map((v) => Number.parseInt(v, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 30);
}
