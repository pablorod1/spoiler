import "server-only";

const BASE = "https://api.themoviedb.org/3";

export const LANGUAGE = "es-ES";
export const REGION = "ES";

export class TmdbError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

/**
 * Low-level TMDB fetcher. Server-only: the credentials never reach the browser.
 * Supports either a v4 read access token (preferred) or a v3 API key.
 * Callers are expected to wrap it in `'use cache'` functions.
 */
export async function tmdb<T>(path: string, params: Params = {}): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!token && !apiKey) {
    throw new Error("Falta TMDB_READ_TOKEN o TMDB_API_KEY en el entorno");
  }

  const url = new URL(BASE + path);
  url.searchParams.set("language", LANGUAGE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  if (!token && apiKey) url.searchParams.set("api_key", apiKey);

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new TmdbError(res.status, `TMDB ${res.status} en ${path}`);
  }
  return res.json() as Promise<T>;
}
