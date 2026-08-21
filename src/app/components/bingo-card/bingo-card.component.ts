import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BingoCard } from '../../models/bingo.models';

@Component({
  selector: 'app-bingo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
  `,
  template: `
    <article class="card h-100">
      <div class="card-body p-2">
        <header class="fw-bold small mb-1">CARTÓN #{{ label() }}</header>
        <table class="table table-bordered table-sm mb-0 text-center align-middle">
          <tbody>
            @for (row of card().rows; track $index) {
              <tr>
                @for (cell of row; track cell.number) {
                  <td [class.table-success]="drawnSet().has(cell.number)">
                    @if (showNumbers()) {
                      <span class="fw-bold d-block">{{ cell.number }}</span>
                    }
                    @if (showTitles()) {
                      <span class="d-block text-muted" style="font-size: 0.65rem;">{{ cell.title }}</span>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </article>
  `,
})
export class BingoCardComponent {
  readonly card = input.required<BingoCard>();
  readonly index = input(0);
  readonly showTitles = input(true);
  /** Numbers are just an internal detail; the printable card grid still shows them, the live game view doesn't. */
  readonly showNumbers = input(true);
  /** Numbers already drawn in the live game, if any — highlights matching cells. */
  readonly drawn = input<number[]>([]);
  protected readonly label = computed(() => String(this.index() + 1).padStart(3, '0'));
  protected readonly drawnSet = computed(() => new Set(this.drawn()));
}
