export interface GameTrack {
  name: string;
  artist: string;
  spotifyId: string;
  image: string;
}

export interface GameNumber {
  number: number;
  track: GameTrack | null;
}

/** Persisted shape of a game: one row per game in the Supabase `games` table (column `state`). */
export interface GameState {
  code: string;
  name: string;
  mapping: GameNumber[];
  drawn: number[];
  pending: number[];
  current: GameNumber | null;
  /** Bumped on every draw/replay/manual-next so the Spotify embed reloads (and autoplays) even for a repeated track id. */
  playTick: number;
}

/** Row shape for listing every game that exists in Supabase ("Mis partidas" screen). */
export interface GameSummary {
  code: string;
  name: string;
  updatedAt: string;
  drawnCount: number;
  total: number;
}
