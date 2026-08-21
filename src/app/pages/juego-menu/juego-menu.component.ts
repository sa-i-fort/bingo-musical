import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GameSpotifyService } from '../../services/game-spotify.service';
import { JuegoService } from '../../services/juego.service';
import { JuegoStateService } from '../../services/juego-state.service';
import { BingoStateService } from '../../services/bingo-state.service';
import { SPOTIFY_CLIENT_ID } from '../../spotify-client-id';

@Component({
  selector: 'app-juego-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <p class="small text-muted mb-3">
      🌐 Las partidas se guardan en Supabase para poder verlas en directo desde otros dispositivos.
    </p>

    <div class="row g-3">
      <div class="col-12 col-lg-6">
        <section class="card shadow-sm h-100">
          <div class="card-body">
            <h2 class="h5 card-title">1. Conectar con Spotify</h2>
            <p class="small text-muted">Necesario para leer la playlist y controlar la reproducción.</p>
            @if (spotify.connected) {
              <p class="text-success mb-0">✔ Conectado con Spotify</p>
            } @else {
              <button type="button" class="btn btn-success" (click)="connect()">Conectar con Spotify</button>
            }
            @if (errorMessage()) {
              <p class="text-danger small mt-2 mb-0">{{ errorMessage() }}</p>
            }
          </div>
        </section>
      </div>

      <div class="col-12 col-lg-6">
        <section class="card shadow-sm h-100">
          <div class="card-body">
            <h2 class="h5 card-title">2. Crear partida nueva</h2>
            @if (bingoState.cards().length === 0) {
              <p class="alert alert-warning small">
                No has generado cartones todavía. <a routerLink="/generador">Ve al generador</a> y créalos primero
                (deben sortear números del 1 al 90 para que la partida los pueda cantar).
              </p>
            } @else {
              <p class="small text-muted mb-2">
                Se vincularán los {{ bingoState.cards().length }} cartones generados actualmente.
              </p>
            }
            <form [formGroup]="form" (ngSubmit)="create()">
              <div class="mb-2">
                <label class="form-label small" for="gameName">Nombre de la partida</label>
                <input id="gameName" class="form-control" formControlName="name" placeholder="Cumpleaños de Luis" />
              </div>
              <div class="mb-3">
                <label class="form-label small" for="playlistUrl">URL de la playlist de Spotify</label>
                <input
                  id="playlistUrl"
                  class="form-control"
                  formControlName="playlistUrl"
                  placeholder="https://open.spotify.com/playlist/..."
                />
              </div>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="!spotify.connected || form.invalid || creating() || bingoState.cards().length === 0"
              >
                {{ creating() ? 'Generando...' : 'Generar partida (90 números)' }}
              </button>
            </form>
          </div>
        </section>
      </div>

      <div class="col-12">
        <section class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <h2 class="h5 card-title mb-0">Mis partidas</h2>
              <a class="btn btn-sm btn-outline-secondary" routerLink="/juego/admin">⚙ Ver todas las partidas</a>
            </div>
            @if (state.myGames().length === 0) {
              <p class="text-muted small mb-0 fst-italic">Aún no has creado ninguna partida.</p>
            } @else {
              <ul class="list-group">
                @for (game of state.myGames(); track game.code) {
                  <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <strong>{{ game.name }}</strong>
                      <span class="text-muted small ms-2">código {{ game.code }}</span>
                    </div>
                    <div class="d-flex gap-2">
                      <a class="btn btn-sm btn-success" [routerLink]="['/juego', game.code]">▶ Reanudar</a>
                      <a class="btn btn-sm btn-outline-secondary" [routerLink]="['/ver', game.code]" target="_blank">
                        👁 Ver espectador
                      </a>
                      <button type="button" class="btn btn-sm btn-outline-danger" (click)="delete(game.code)">🗑</button>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class JuegoMenuComponent implements OnInit {
  protected readonly spotify = inject(GameSpotifyService);
  protected readonly state = inject(JuegoStateService);
  protected readonly bingoState = inject(BingoStateService);
  private readonly juego = inject(JuegoService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    playlistUrl: ['', Validators.required],
  });
  protected readonly creating = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.spotify.consumeLoginRedirect();
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    }
  }

  connect(): void {
    void this.spotify.startLogin(SPOTIFY_CLIENT_ID);
  }

  async create(): Promise<void> {
    if (this.form.invalid || !this.spotify.connected || this.bingoState.cards().length === 0) return;
    this.creating.set(true);
    this.errorMessage.set(null);
    const { name, playlistUrl } = this.form.getRawValue();
    try {
      const code = await this.juego.createGame(name.trim(), playlistUrl.trim(), this.bingoState.cards());
      await this.router.navigate(['/juego', code]);
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    } finally {
      this.creating.set(false);
    }
  }

  async delete(code: string): Promise<void> {
    if (!confirm('¿Borrar esta partida permanentemente?')) return;
    await this.juego.deleteGame(code);
  }
}
