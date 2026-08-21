export interface GameTrack {
  name: string;
  artist: string;
  uri: string;
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
}

/** Local-only reference to a game this browser created, used to list "my games" without a login system. */
export interface MyGameRef {
  code: string;
  name: string;
  createdAt: string;
}

/** Row shape for listing every game that exists in Supabase (admin screen), regardless of who created it. */
export interface AdminGameRef {
  code: string;
  name: string;
  updatedAt: string;
  drawnCount: number;
}
