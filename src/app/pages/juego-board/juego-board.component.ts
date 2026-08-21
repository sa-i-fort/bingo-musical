import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JuegoService } from '../../services/juego.service';
import { JuegoStateService, getActiveGameCode } from '../../services/juego-state.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { GameNumber } from '../../models/juego.models';
import { SongListComponent } from '../../components/song-list/song-list.component';
import { LeaderboardComponent } from '../../components/leaderboard/leaderboard.component';
import { SpotifyEmbedComponent } from '../../components/spotify-embed/spotify-embed.component';

@Component({
  selector: 'app-juego-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SongListComponent, LeaderboardComponent, SpotifyEmbedComponent, RouterLink],
  template: `
    @if (state.errorMessage()) {
      <p class="alert alert-danger">{{ state.errorMessage() }}</p>
    } @else if (state.loading()) {
      <p class="text-muted">Cargando partida…</p>
    } @else if (!state.game()) {
      <div class="card shadow-sm">
        <div class="card-body text-center py-5">
          <h2 class="h5">No hay ninguna partida activa</h2>
          <p class="text-muted">Genera unos cartones y arranca una partida desde el Generador.</p>
          <div class="d-flex justify-content-center gap-2 mt-3">
            <a class="btn btn-primary" routerLink="/generador">Ir al Generador</a>
            <a class="btn btn-outline-secondary" routerLink="/mis-partidas">Ver mis partidas</a>
          </div>
        </div>
      </div>
    } @else {
      <p class="small text-muted">
        Enlace para espectadores: <code>{{ spectatorLink() }}</code>
      </p>

      <div class="row g-3">
        <div class="col-12 col-lg-4">
          <section class="card shadow-sm text-center">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted">Sonando ahora</h2>
              @if (state.game()!.current?.track; as track) {
                <p class="fw-bold mb-1">{{ track.name }}</p>
                <p class="text-muted small mb-2">{{ track.artist }}</p>
                <app-spotify-embed [spotifyId]="track.spotifyId" [reloadTick]="reloadTick()" />
              } @else if (state.game()!.current) {
                <p class="text-muted fst-italic mt-3">Número comodín (sin canción)</p>
              } @else {
                <p class="text-muted fst-italic mt-3">Todavía no ha empezado a sonar nada.</p>
              }
            </div>
          </section>

          <div class="d-grid gap-2 mt-3">
            <button type="button" class="btn btn-success btn-lg" [disabled]="drawing()" (click)="draw()">
              🎲 Sacar siguiente
            </button>
            <button type="button" class="btn btn-outline-primary" (click)="downloadSongList()">
              ⬇ Descargar listado de canciones
            </button>
          </div>
        </div>

        <div class="col-12 col-lg-8">
          <section class="card shadow-sm mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h5 mb-0">Canciones</h2>
                <span class="badge text-bg-success fs-6">
                  {{ state.game()!.drawn.length }} / {{ state.game()!.mapping.length }}
                </span>
              </div>
              <app-song-list
                [mapping]="state.game()!.mapping"
                [drawn]="state.game()!.drawn"
                [interactive]="true"
                (replay)="replaySong($event)"
                (forceNext)="confirmForceNext($event)"
              />
            </div>
          </section>

          <section class="card shadow-sm">
            <div class="card-body">
              <h2 class="h5 card-title">🏆 Clasificación</h2>
              <app-leaderboard [cards]="state.linkedCards()" [drawn]="state.game()!.drawn" />
            </div>
          </section>
        </div>
      </div>
    }
  `,
})
export class JuegoBoardComponent implements OnInit {
  protected readonly state = inject(JuegoStateService);
  private readonly juego = inject(JuegoService);
  private readonly pdfGenerator = inject(PdfGeneratorService);
  private readonly route = inject(ActivatedRoute);

  protected readonly drawing = signal(false);
  protected readonly reloadTick = signal(0);
  protected readonly spectatorLink = signal('');

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.paramMap.get('code') ?? getActiveGameCode();
    this.state.errorMessage.set(null);
    if (!code) return;

    this.state.loading.set(true);
    this.spectatorLink.set(`${window.location.origin}${window.location.pathname}#/ver/${code}`);
    try {
      await this.juego.loadGame(code);
    } catch (error) {
      this.state.errorMessage.set((error as Error).message);
    } finally {
      this.state.loading.set(false);
    }
  }

  async draw(): Promise<void> {
    this.drawing.set(true);
    try {
      await this.juego.drawNext();
      this.reloadTick.set(0);
    } finally {
      this.drawing.set(false);
    }
  }

  replaySong(song: GameNumber): void {
    this.juego.replay(song.number);
    this.reloadTick.set(0);
  }

  async confirmForceNext(song: GameNumber): Promise<void> {
    const label = song.track ? `${song.track.name} - ${song.track.artist}` : 'este comodín';
    if (!confirm(`¿Poner "${label}" como siguiente, saltándote el orden aleatorio? Esta acción no se puede deshacer.`)) {
      return;
    }
    await this.juego.drawSpecific(song.number);
    this.reloadTick.set(0);
  }

  downloadSongList(): void {
    const game = this.state.game();
    if (!game) return;
    const songs = game.mapping
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((m) => ({ number: m.number, title: m.track ? `${m.track.name} - ${m.track.artist}` : 'Comodín' }));
    this.pdfGenerator.downloadSongList(songs);
  }
}
