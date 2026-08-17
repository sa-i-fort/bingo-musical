import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-csv-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.songs().length > 0) {
      <div class="summary">
        <span>Total: {{ state.songs().length }}</span>
        <span>Mín: {{ minNumber() }}</span>
        <span>Máx: {{ maxNumber() }}</span>
      </div>
      <table>
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
      @if (state.songs().length > preview().length) {
        <p class="more">… y {{ state.songs().length - preview().length }} más</p>
      }
    }
  `,
  styles: `
    .summary {
      display: flex;
      gap: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th,
    td {
      border-bottom: 1px solid var(--border);
      padding: 0.25rem 0.5rem;
      text-align: left;
    }
    .more {
      opacity: 0.7;
      font-style: italic;
    }
  `,
})
export class CsvPreviewComponent {
  protected readonly state = inject(BingoStateService);
  protected readonly preview = computed(() => this.state.songs().slice(0, 10));
  protected readonly minNumber = computed(() => Math.min(...this.state.songs().map((s) => s.number)));
  protected readonly maxNumber = computed(() => Math.max(...this.state.songs().map((s) => s.number)));
}
