import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { BingoCard, Song } from '../models/bingo.models';
import { GameState, GameSummary } from '../models/juego.models';
import { SupabaseClientService } from './supabase-client.service';
import { JuegoStateService, allSongsPlayable, buildMapping, newGameCode, setActiveGameCode } from './juego-state.service';

/** Business logic for the "juego" module: create/draw/persist games, realtime sync for spectators. */
@Injectable({ providedIn: 'root' })
export class JuegoService {
  private channel: RealtimeChannel | null = null;

  constructor(
    private readonly supabase: SupabaseClientService,
    private readonly state: JuegoStateService,
  ) {}

  /** Creates a game from the songs and cards already generated in the "Generador" tab. */
  async createGame(name: string, songs: readonly Song[], cards: readonly BingoCard[]): Promise<string> {
    if (!allSongsPlayable(songs)) {
      throw new Error('Todas las canciones deben venir de Spotify (con su track id) para poder jugar en directo.');
    }
    const mapping = buildMapping(songs);
    const pending = mapping.map((m) => m.number);

    // Retry a couple of times on the (very unlikely) code collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newGameCode();
      const game: GameState = { code, name, mapping, drawn: [], pending, current: null };
      const { error } = await this.supabase.client.from('games').insert({ code, state: game });
      if (!error) {
        await this.attachCards(code, cards);
        setActiveGameCode(code);
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
    setActiveGameCode(code);
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
  }

  async deleteGame(code: string): Promise<void> {
    await this.supabase.client.from('games').delete().eq('code', code);
    if (this.state.game()?.code === code) this.state.game.set(null);
  }

  /** Lists every game in Supabase, for the "Mis partidas" screen. */
  async listAllGames(): Promise<GameSummary[]> {
    const { data, error } = await this.supabase.client
      .from('games')
      .select('code, state, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error('No se pudieron cargar las partidas.');
    return (data ?? []).map((row) => {
      const gameState = row.state as GameState;
      return {
        code: row.code as string,
        name: gameState.name,
        updatedAt: row.updated_at as string,
        drawnCount: gameState.drawn.length,
        total: gameState.mapping.length,
      };
    });
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
