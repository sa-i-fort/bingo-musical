import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BingoCard } from '../../models/bingo.models';

@Component({
  selector: 'app-bingo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card h-100">
      <div class="card-body p-2">
        <header class="fw-bold small mb-1">CARTÓN #{{ label() }}</header>
        <table class="table table-bordered table-sm mb-0 text-center align-middle">
          <tbody>
            @for (row of card().rows; track $index) {
              <tr>
                @for (cell of row; track cell.number) {
                  <td>
                    <span class="fw-bold d-block">{{ cell.number }}</span>
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
  protected readonly label = computed(() => String(this.index() + 1).padStart(3, '0'));
}
