import { Injectable, signal } from '@angular/core';
import { BingoCard, Song } from '../models/bingo.models';
import { GameNumber, GameState } from '../models/juego.models';
import { splitSongTitle } from '../utils/song-title.util';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: easier to read aloud/type
const ACTIVE_GAME_KEY = 'bingo-musical:active-game-code';

function randomGameCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

export function newGameCode(): string {
  return randomGameCode();
}

export function getActiveGameCode(): string | null {
  return localStorage.getItem(ACTIVE_GAME_KEY);
}

export function setActiveGameCode(code: string): void {
  localStorage.setItem(ACTIVE_GAME_KEY, code);
}

/** Every song must come from Spotify (needs a track id) to be playable in the embedded player. */
export function allSongsPlayable(songs: readonly Song[]): boolean {
  return songs.length > 0 && songs.every((s) => !!s.spotifyId);
}

/**
 * Maps each song directly onto its own number (1:1, no shuffling): song numbers are already the
 * bingo numbers the generated cards use, so the game just announces them in that same numbering.
 */
export function buildMapping(songs: readonly Song[]): GameNumber[] {
  return songs.map((song) => {
    if (!song.spotifyId) return { number: song.number, track: null };
    const [name, artist] = splitSongTitle(song.title);
    return {
      number: song.number,
      track: { name, artist: artist ?? '', spotifyId: song.spotifyId, image: song.image ?? '' },
    };
  });
}

/** Signal-based state for the "juego" module: the active game and its linked cards (leaderboard). */
@Injectable({ providedIn: 'root' })
export class JuegoStateService {
  readonly game = signal<GameState | null>(null);
  readonly linkedCards = signal<BingoCard[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
}
