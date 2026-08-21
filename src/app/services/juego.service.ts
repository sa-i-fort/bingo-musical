import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { BingoCard } from '../models/bingo.models';
import { AdminGameRef, GameState } from '../models/juego.models';
import { SupabaseClientService } from './supabase-client.service';
import { GameSpotifyService } from './game-spotify.service';
import { JuegoStateService, buildMapping, newGameCode } from './juego-state.service';

/** Business logic for the "juego" module: create/draw/persist games, realtime sync for spectators. */
@Injectable({ providedIn: 'root' })
export class JuegoService {
  private channel: RealtimeChannel | null = null;

  constructor(
    private readonly supabase: SupabaseClientService,
    private readonly spotify: GameSpotifyService,
    private readonly state: JuegoStateService,
  ) {}

  async createGame(name: string, playlistUrl: string, cards: readonly BingoCard[]): Promise<string> {
    const tracks = await this.spotify.fetchPlaylistTracks(playlistUrl);
    const mapping = buildMapping(tracks);
    const pending = mapping.map((m) => m.number);

    // Retry a couple of times on the (very unlikely) code collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newGameCode();
      const game: GameState = { code, name, mapping, drawn: [], pending, current: null };
      const { error } = await this.supabase.client.from('games').insert({ code, state: game });
      if (!error) {
        await this.attachCards(code, cards);
        this.state.rememberGame({ code, name, createdAt: new Date().toISOString() });
        this.state.game.set(game);
        this.state.linkedCards.set(cards.slice());
        return code;
      }
      if (error.code !== '23505') throw new Error('No se pudo guardar la partida en Supabase.');
    }
    throw new Error('No se pudo generar un código de partida único, inténtalo de nuevo.');
  }

  async loadGame(code: string): Promise<void> {
    const [gameResult, cardsResult] = await Promise.all([
      this.supabase.client.from('games').select('state').eq('code', code).single(),
      this.supabase.client.from('cards').select('card_id, rows').eq('game_code', code),
    ]);
    if (gameResult.error || !gameResult.data) throw new Error('Partida no encontrada.');
    this.state.game.set((gameResult.data as { state: GameState }).state);
    const cardRows = (cardsResult.data ?? []) as { card_id: string; rows: BingoCard['rows'] }[];
    this.state.linkedCards.set(cardRows.map((c) => ({ id: c.card_id, rows: c.rows })));
  }

  async drawNext(): Promise<void> {
    const game = this.state.game();
    if (!game || game.pending.length === 0) return;
    const index = Math.floor(Math.random() * game.pending.length);
    const number = game.pending[index];
    const pending = game.pending.filter((_, i) => i !== index);
    const drawn = [...game.drawn, number];
    const current = game.mapping.find((m) => m.number === number) ?? null;
    const updated: GameState = { ...game, drawn, pending, current };
    this.state.game.set(updated);
    await this.persist(updated);
    if (current?.track) await this.spotify.play(current.track.uri);
  }

  async replayCurrent(): Promise<void> {
    const track = this.state.game()?.current?.track;
    if (track) await this.spotify.play(track.uri);
  }

  async deleteGame(code: string): Promise<void> {
    await this.supabase.client.from('games').delete().eq('code', code);
    this.state.forgetGame(code);
    if (this.state.game()?.code === code) this.state.game.set(null);
  }

  /** Lists every game in Supabase (not just this browser's), for the admin screen. */
  async listAllGames(): Promise<AdminGameRef[]> {
    const { data, error } = await this.supabase.client
      .from('games')
      .select('code, state, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error('No se pudieron cargar las partidas.');
    return (data ?? []).map((row) => ({
      code: row.code as string,
      name: (row.state as GameState).name,
      updatedAt: row.updated_at as string,
      drawnCount: (row.state as GameState).drawn.length,
    }));
  }

  /** Subscribes to live updates for a game (used by the read-only spectator view). */
  subscribeToUpdates(code: string): void {
    this.unsubscribe();
    this.channel = this.supabase.client
      .channel(`game:${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `code=eq.${code}` },
        (payload) => this.state.game.set((payload.new as { state: GameState }).state),
      )
      .subscribe();
  }

  unsubscribe(): void {
    if (this.channel) {
      this.supabase.client.removeChannel(this.channel);
      this.channel = null;
    }
  }

  private async attachCards(gameCode: string, cards: readonly BingoCard[]): Promise<void> {
    if (cards.length === 0) return;
    const rows = cards.map((card) => ({ game_code: gameCode, card_id: card.id, rows: card.rows }));
    const { error } = await this.supabase.client.from('cards').insert(rows);
    if (error) throw new Error('No se pudieron vincular los cartones a la partida.');
  }

  private async persist(game: GameState): Promise<void> {
    await this.supabase.client.from('games').update({ state: game }).eq('code', game.code);
  }
}
