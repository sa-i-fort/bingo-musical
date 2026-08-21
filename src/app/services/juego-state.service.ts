import { Injectable, signal } from '@angular/core';
import { BingoCard } from '../models/bingo.models';
import { GameNumber, GameState, MyGameRef } from '../models/juego.models';
import { shuffle } from '../utils/random.util';

const MY_GAMES_KEY = 'bingo-musical:my-games';
const TOTAL_NUMBERS = 90;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: easier to read aloud/type

function loadMyGames(): MyGameRef[] {
  try {
    return JSON.parse(localStorage.getItem(MY_GAMES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function randomGameCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

/** Signal-based state for the "juego" module: the active game, its linked cards (leaderboard), and this browser's list of created games. */
@Injectable({ providedIn: 'root' })
export class JuegoStateService {
  readonly game = signal<GameState | null>(null);
  readonly linkedCards = signal<BingoCard[]>([]);
  readonly myGames = signal<MyGameRef[]>(loadMyGames());
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  rememberGame(ref: MyGameRef): void {
    const updated = [ref, ...this.myGames().filter((g) => g.code !== ref.code)];
    this.myGames.set(updated);
    localStorage.setItem(MY_GAMES_KEY, JSON.stringify(updated));
  }

  forgetGame(code: string): void {
    const updated = this.myGames().filter((g) => g.code !== code);
    this.myGames.set(updated);
    localStorage.setItem(MY_GAMES_KEY, JSON.stringify(updated));
  }
}

export function newGameCode(): string {
  return randomGameCode();
}

/** Assigns tracks to random numbers 1..90 (fewer tracks than 90 leaves "comodín" blank numbers). */
export function buildMapping(tracks: readonly { name: string; artist: string; uri: string; image: string }[]): GameNumber[] {
  const shuffledTracks = shuffle(tracks);
  const slots: GameNumber[] = Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({ number: i + 1, track: null }));
  const limit = Math.min(shuffledTracks.length, TOTAL_NUMBERS);
  for (let i = 0; i < limit; i++) slots[i].track = shuffledTracks[i];
  const shuffledSlots = shuffle(slots);
  shuffledSlots.forEach((slot, index) => (slot.number = index + 1));
  return shuffledSlots;
}
