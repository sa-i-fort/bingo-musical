import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-csv-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.songs().length > 0) {
      <div class="d-flex flex-wrap align-items-center gap-3 fw-semibold mb-2">
        <span>Total: {{ state.songs().length }}</span>
        <span>Mín: {{ minNumber() }}</span>
        <span>Máx: {{ maxNumber() }}</span>
      </div>
      <div class="table-responsive overflow-auto" style="max-height: 340px;">
        <table class="table table-sm table-striped mb-0">
          <thead class="sticky-top bg-white">
            <tr>
              <th scope="col">Número</th>
              <th scope="col">Canción</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            @for (song of state.songs(); track song.number) {
              <tr>
                <td>{{ song.number }}</td>
                <td>{{ song.title }}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary py-0"
                    title="Eliminar"
                    (click)="delete(song.number)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CsvPreviewComponent {
  protected readonly state = inject(BingoStateService);
  protected readonly minNumber = computed(() => Math.min(...this.state.songs().map((s) => s.number)));
  protected readonly maxNumber = computed(() => Math.max(...this.state.songs().map((s) => s.number)));

  delete(number: number): void {
    const remaining = this.state
      .songs()
      .filter((s) => s.number !== number)
      .map((s, index) => ({ ...s, number: index + 1 }));

    this.state.songs.set(remaining);
    this.state.settings.update((settings) => ({ ...settings, totalSongs: remaining.length }));
    this.state.cards.set([]);
  }
}
