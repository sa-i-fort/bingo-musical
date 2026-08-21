import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameSummary } from '../../models/juego.models';
import { JuegoService } from '../../services/juego.service';

/** Lists every game that exists in Supabase so it can be resumed, watched, or deleted. */
@Component({
  selector: 'app-mis-partidas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <p class="small text-muted mb-3">
      Todas las partidas guardadas en Supabase. Borrar una partida borra también sus cartones vinculados.
    </p>

    @if (errorMessage()) {
      <p class="alert alert-danger">{{ errorMessage() }}</p>
    } @else if (loading()) {
      <p class="text-muted">Cargando…</p>
    } @else if (games().length === 0) {
      <p class="text-muted fst-italic">No hay partidas guardadas todavía. Créalas desde el Generador.</p>
    } @else {
      <ul class="list-group">
        @for (game of games(); track game.code) {
          <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong>{{ game.name }}</strong>
              <span class="text-muted small ms-2">
                código {{ game.code }} · {{ game.drawnCount }} / {{ game.total }} cantados
              </span>
            </div>
            <div class="d-flex gap-2">
              <a class="btn btn-sm btn-success" [routerLink]="['/juego', game.code]">▶ Reanudar</a>
              <button type="button" class="btn btn-sm btn-outline-warning" (click)="reset(game.code)">↺ Reiniciar</button>
              <button type="button" class="btn btn-sm btn-outline-danger" (click)="delete(game.code)">🗑 Borrar</button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class MisPartidasComponent implements OnInit {
  private readonly juego = inject(JuegoService);

  protected readonly games = signal<GameSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    void this.refresh();
  }

  async delete(code: string): Promise<void> {
    if (!confirm('¿Borrar esta partida y sus cartones permanentemente?')) return;
    await this.juego.deleteGame(code);
    await this.refresh();
  }

  async reset(code: string): Promise<void> {
    if (!confirm('¿Reiniciar esta partida? Se borrarán todas las canciones cantadas, pero se mantendrán los cartones.'))
      return;
    await this.juego.resetGame(code);
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.games.set(await this.juego.listAllGames());
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
