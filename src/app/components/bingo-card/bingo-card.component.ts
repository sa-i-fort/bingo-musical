import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BingoCard } from '../../models/bingo.models';

@Component({
  selector: 'app-bingo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <header>CARTÓN #{{ label() }}</header>
      <table>
        <tbody>
          @for (row of card().rows; track $index) {
            <tr>
              @for (cell of row; track cell.number) {
                <td>
                  <span class="number">{{ cell.number }}</span>
                  @if (showTitles()) {
                    <span class="title">{{ cell.title }}</span>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </article>
  `,
  styles: `
    .card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.5rem;
    }
    header {
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      border: 1px solid var(--border);
      text-align: center;
      padding: 0.25rem;
    }
    .number {
      display: block;
      font-weight: 700;
    }
    .title {
      display: block;
      font-size: 0.65rem;
      opacity: 0.75;
    }
  `,
})
export class BingoCardComponent {
  readonly card = input.required<BingoCard>();
  readonly index = input(0);
  readonly showTitles = input(true);
  protected readonly label = computed(() => String(this.index() + 1).padStart(3, '0'));
}
