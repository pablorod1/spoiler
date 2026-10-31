export type MediaType = "movie" | "tv";

export interface Genre {
  id: number;
  name: string;
}

/** Item as returned by list endpoints (discover, trending, search, similar…) */
export interface MediaSummary {
  id: number;
  media_type: MediaType;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  date: string | null; // release_date | first_air_date
  genre_ids: number[];
  original_language: string;
}

export interface PersonSummary {
  id: number;
  media_type: "person";
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for: MediaSummary[];
}

export interface Paged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export type Monetization = "flatrate" | "free" | "ads" | "rent" | "buy";

export interface WatchAvailability {
  link?: string;
  flatrate?: Provider[];
  free?: Provider[];
  ads?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1: string;
  published_at: string;
  /** Upload resolution reported by TMDB (360, 480, 720, 1080, 2160) */
  size?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface ImageAsset {
  file_path: string;
  iso_639_1: string | null;
  aspect_ratio: number;
  vote_average: number;
  width: number;
}

export interface Season {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
  vote_average: number;
}

export interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
}

export interface MediaDetails extends MediaSummary {
  tagline: string | null;
  genres: Genre[];
  runtime: number | null; // minutes (movie runtime or typical episode runtime)
  status: string;
  certification: string | null;
  homepage: string | null;
  imdb_id: string | null;
  budget?: number;
  revenue?: number;
  // tv only
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  next_episode_to_air?: Episode | null;
  last_episode_to_air?: Episode | null;
  networks?: { id: number; name: string; logo_path: string | null }[];
  creators: { id: number; name: string }[];
  collection: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null;
  // appended
  directors: CrewMember[];
  writers: CrewMember[];
  cast: CastMember[];
  videos: Video[];
  trailer: Video | null;
  logo: ImageAsset | null;
  availability: WatchAvailability | null;
  recommendations: MediaSummary[];
  keywords: { id: number; name: string }[];
}

export interface PersonCredit extends MediaSummary {
  character?: string;
  job?: string;
  episode_count?: number;
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  imdb_id: string | null;
  /** computed at cache time (avoids reading the clock during render) */
  age: number | null;
  cast: PersonCredit[];
  crew: PersonCredit[];
  knownFor: PersonCredit[];
}
