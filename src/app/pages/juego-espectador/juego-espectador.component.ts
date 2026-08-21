import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JuegoService } from '../../services/juego.service';
import { JuegoStateService } from '../../services/juego-state.service';
import { NumbersBoardComponent } from '../../components/numbers-board/numbers-board.component';
import { LeaderboardComponent } from '../../components/leaderboard/leaderboard.component';

@Component({
  selector: 'app-juego-espectador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumbersBoardComponent, LeaderboardComponent],
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
                <img [src]="track.image" alt="" class="rounded shadow-sm my-2" width="140" height="140" />
                <p class="fw-bold mb-0">{{ track.name }}</p>
                <p class="text-muted small">{{ track.artist }}</p>
                <a [href]="track.uri" class="btn btn-sm btn-outline-success mt-2">🎧 Abrir en Spotify</a>
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
                <span class="badge text-bg-success fs-6">{{ state.game()!.drawn.length }} / 90</span>
              </div>
              <app-numbers-board [drawn]="state.game()!.drawn" />
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
