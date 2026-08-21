import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGameRef } from '../../models/juego.models';
import { JuegoService } from '../../services/juego.service';

/** Lists every game that exists in Supabase (regardless of who created it) so it can be deleted. */
@Component({
  selector: 'app-juego-admin',
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
      <p class="text-muted fst-italic">No hay partidas guardadas.</p>
    } @else {
      <ul class="list-group">
        @for (game of games(); track game.code) {
          <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong>{{ game.name }}</strong>
              <span class="text-muted small ms-2">código {{ game.code }} · {{ game.drawnCount }} / 90 cantados</span>
            </div>
            <div class="d-flex gap-2">
              <a class="btn btn-sm btn-success" [routerLink]="['/juego', game.code]">▶ Reanudar</a>
              <a class="btn btn-sm btn-outline-secondary" [routerLink]="['/ver', game.code]" target="_blank">
                👁 Ver espectador
              </a>
              <button type="button" class="btn btn-sm btn-outline-danger" (click)="delete(game.code)">🗑 Borrar</button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class JuegoAdminComponent implements OnInit {
  private readonly juego = inject(JuegoService);

  protected readonly games = signal<AdminGameRef[]>([]);
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
