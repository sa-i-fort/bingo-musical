import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-csv-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.songs().length > 0) {
      <div class="d-flex gap-3 fw-semibold mb-2">
        <span>Total: {{ state.songs().length }}</span>
        <span>Mín: {{ minNumber() }}</span>
        <span>Máx: {{ maxNumber() }}</span>
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-striped">
          <thead>
            <tr>
              <th scope="col">Número</th>
              <th scope="col">Canción</th>
            </tr>
          </thead>
          <tbody>
            @for (song of preview(); track song.number) {
              <tr>
                <td>{{ song.number }}</td>
                <td>{{ song.title }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (state.songs().length > preview().length) {
        <p class="text-muted fst-italic">… y {{ state.songs().length - preview().length }} más</p>
      }
    }
  `,
})
export class CsvPreviewComponent {
  protected readonly state = inject(BingoStateService);
  protected readonly preview = computed(() => this.state.songs().slice(0, 10));
  protected readonly minNumber = computed(() => Math.min(...this.state.songs().map((s) => s.number)));
  protected readonly maxNumber = computed(() => Math.max(...this.state.songs().map((s) => s.number)));
}
