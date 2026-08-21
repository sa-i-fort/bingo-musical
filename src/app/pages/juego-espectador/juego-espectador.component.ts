import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JuegoService } from '../../services/juego.service';
import { JuegoStateService } from '../../services/juego-state.service';
import { NumbersBoardComponent } from '../../components/numbers-board/numbers-board.component';
import { LeaderboardComponent } from '../../components/leaderboard/leaderboard.component';
import { SpotifyEmbedComponent } from '../../components/spotify-embed/spotify-embed.component';

@Component({
  selector: 'app-juego-espectador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumbersBoardComponent, LeaderboardComponent, SpotifyEmbedComponent],
  template: `
    @if (state.errorMessage()) {
      <p class="alert alert-danger">{{ state.errorMessage() }}</p>
    } @else if (!state.game()) {
      <p class="text-muted">Cargando partida…</p>
    } @else {
      <div class="row g-3">
        <div class="col-12 col-lg-4">
          <section class="card shadow-sm text-center">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted">Número actual</h2>
              <div class="display-1 fw-bold text-success">{{ state.game()!.current?.number ?? '-' }}</div>
              @if (state.game()!.current?.track; as track) {
                <p class="fw-bold mb-1">{{ track.name }}</p>
                <p class="text-muted small mb-2">{{ track.artist }}</p>
                <app-spotify-embed [spotifyId]="track.spotifyId" />
              } @else if (state.game()!.current) {
                <p class="text-muted fst-italic mt-3">Número comodín (sin canción)</p>
              } @else {
                <p class="text-muted fst-italic mt-3">Esperando a que empiece la partida…</p>
              }
            </div>
          </section>
        </div>

        <div class="col-12 col-lg-8">
          <section class="card shadow-sm mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h5 mb-0">Tablero general</h2>
                <span class="badge text-bg-success fs-6">
                  {{ state.game()!.drawn.length }} / {{ state.game()!.mapping.length }}
                </span>
              </div>
              <app-numbers-board [drawn]="state.game()!.drawn" [total]="state.game()!.mapping.length" />
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
export class JuegoEspectadorComponent implements OnInit, OnDestroy {
  protected readonly state = inject(JuegoStateService);
  private readonly juego = inject(JuegoService);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.state.errorMessage.set(null);
    try {
      await this.juego.loadGame(code);
      this.juego.subscribeToUpdates(code);
    } catch (error) {
      this.state.errorMessage.set((error as Error).message);
    }
  }

  ngOnDestroy(): void {
    this.juego.unsubscribe();
  }
}
