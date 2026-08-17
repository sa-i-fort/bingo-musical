import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
      <p class="small text-muted mb-2">Arrastra las filas (⠿) para reordenar la lista.</p>
      <div class="table-responsive overflow-auto" style="max-height: 340px;">
        <table class="table table-sm table-striped mb-0">
          <thead class="sticky-top bg-white">
            <tr>
              <th scope="col"></th>
              <th scope="col">Número</th>
              <th scope="col">Canción</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            @for (song of state.songs(); track song.number; let i = $index) {
              <tr
                draggable="true"
                [class.table-active]="dragIndex() === i"
                (dragstart)="onDragStart(i)"
                (dragover)="$event.preventDefault()"
                (drop)="onDrop(i)"
                (dragend)="dragIndex.set(null)"
              >
                <td class="text-muted" style="cursor: grab;">⠿</td>
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
    } @else {
      <p class="text-muted mb-0">Aún no se han cargado canciones.</p>
    }
  `,
})
export class CsvPreviewComponent {
  protected readonly state = inject(BingoStateService);
  protected readonly minNumber = computed(() => Math.min(...this.state.songs().map((s) => s.number)));
  protected readonly maxNumber = computed(() => Math.max(...this.state.songs().map((s) => s.number)));
  protected readonly dragIndex = signal<number | null>(null);

  onDragStart(index: number): void {
    this.dragIndex.set(index);
  }

  onDrop(targetIndex: number): void {
    const from = this.dragIndex();
    this.dragIndex.set(null);
    if (from === null || from === targetIndex) return;

    const songs = [...this.state.songs()];
    const [moved] = songs.splice(from, 1);
    songs.splice(targetIndex, 0, moved);
    this.state.songs.set(songs.map((s, index) => ({ ...s, number: index + 1 })));
    this.state.cards.set([]);
  }

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
