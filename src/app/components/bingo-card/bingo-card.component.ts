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
    table {
      table-layout: fixed;
    }
    td {
      height: 5.5rem;
      overflow: hidden;
    }
    td.table-success {
      border-color: #198754;
      border-width: 2px;
    }
    td span.title {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 0.7rem;
      line-height: 1.1;
    }
  `,
  template: `
    <article class="card h-100">
      <div class="card-body p-2">
        <header class="fw-bold small mb-1">{{ headerLabel() }}</header>
        <table class="table table-bordered table-sm mb-0 text-center align-middle">
          <tbody>
            @for (row of card().rows; track $index) {
              <tr>
                @for (cell of row; track cell.number) {
                  <td [class.table-success]="drawnSet().has(cell.number)">
                    @if (showNumbers()) {
                      <span class="fw-bold fs-5">{{ cell.number }}</span>
                    }
                    @if (showTitles()) {
                      <span class="title text-muted">{{ cell.title }}</span>
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
  /** Printed in the card header as "NOMBRE - CARTÓN #001"; falls back to just the card number if blank. */
  readonly gameName = input('');
  protected readonly label = computed(() => String(this.index() + 1).padStart(3, '0'));
  protected readonly headerLabel = computed(() => {
    const name = this.gameName().trim();
    return name ? `${name} - CARTÓN #${this.label()}` : `CARTÓN #${this.label()}`;
  });
  protected readonly drawnSet = computed(() => new Set(this.drawn()));
}
