import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JuegoService } from '../../services/juego.service';
import { JuegoStateService } from '../../services/juego-state.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { NumbersBoardComponent } from '../../components/numbers-board/numbers-board.component';
import { LeaderboardComponent } from '../../components/leaderboard/leaderboard.component';

@Component({
  selector: 'app-juego-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumbersBoardComponent, LeaderboardComponent],
  template: `
    @if (state.errorMessage()) {
      <p class="alert alert-danger">{{ state.errorMessage() }}</p>
    } @else if (!state.game()) {
      <p class="text-muted">Cargando partida…</p>
    } @else {
      <p class="small text-muted">
        Enlace para espectadores: <code>{{ spectatorLink() }}</code>
      </p>

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
              } @else if (state.game()!.current) {
                <p class="text-muted fst-italic mt-3">Número comodín (sin canción)</p>
              }
            </div>
          </section>

          <div class="d-grid gap-2 mt-3">
            <button type="button" class="btn btn-success btn-lg" [disabled]="drawing()" (click)="draw()">
              🎲 Sacar siguiente
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              [disabled]="!state.game()!.current?.track"
              (click)="replay()"
            >
              🔁 Volver a reproducir
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
export class JuegoBoardComponent implements OnInit {
  protected readonly state = inject(JuegoStateService);
  private readonly juego = inject(JuegoService);
  private readonly pdfGenerator = inject(PdfGeneratorService);
  private readonly route = inject(ActivatedRoute);

  protected readonly drawing = signal(false);
  protected readonly spectatorLink = signal('');

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.spectatorLink.set(`${window.location.origin}${window.location.pathname}#/ver/${code}`);
    this.state.errorMessage.set(null);
    try {
      await this.juego.loadGame(code);
    } catch (error) {
      this.state.errorMessage.set((error as Error).message);
    }
  }

  async draw(): Promise<void> {
    this.drawing.set(true);
    try {
      await this.juego.drawNext();
    } finally {
      this.drawing.set(false);
    }
  }

  async replay(): Promise<void> {
    await this.juego.replayCurrent();
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
