import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Read-only 1..90 board grid, shared by the director and spectator views. */
@Component({
  selector: 'app-numbers-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board-grid">
      @for (n of numbers; track n) {
        <div class="board-cell" [class.board-cell-drawn]="drawnSet().has(n)">{{ n }}</div>
      }
    </div>
  `,
  styles: `
    .board-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 0.35rem;
    }
    .board-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      border-radius: 0.375rem;
      border: 1px solid #dee2e6;
      background: #f8f9fa;
      color: #6c757d;
    }
    .board-cell-drawn {
      background: #198754;
      color: white;
      border-color: #198754;
    }
  `,
})
export class NumbersBoardComponent {
  readonly drawn = input.required<number[]>();
  protected readonly numbers = Array.from({ length: 90 }, (_, i) => i + 1);
  protected readonly drawnSet = computed(() => new Set(this.drawn()));
}
