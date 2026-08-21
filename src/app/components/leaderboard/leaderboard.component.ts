import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { BingoCard } from '../../models/bingo.models';
import { BingoCardComponent } from '../bingo-card/bingo-card.component';

interface LeaderboardRow {
  card: BingoCard;
  cardId: string;
  hits: number;
  total: number;
}

/** Ranks the linked cards by how many of their numbers have already been drawn. */
@Component({
  selector: 'app-leaderboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BingoCardComponent],
  template: `
    @if (rows().length === 0) {
      <p class="text-muted small fst-italic mb-0">No hay cartones vinculados a esta partida.</p>
    } @else {
      <ol class="list-group list-group-numbered">
        @for (row of rows(); track row.cardId) {
          <li class="list-group-item d-flex align-items-start">
            <div class="flex-grow-1 ms-1">
              <div class="d-flex align-items-center gap-2">
                <button
                  type="button"
                  class="btn btn-link p-0 text-decoration-none flex-grow-1 text-truncate text-start"
                  (click)="toggle(row.cardId)"
                >
                  Cartón #{{ row.cardId }}
                </button>
                <span class="badge text-bg-success rounded-pill flex-shrink-0">{{ row.hits }} / {{ row.total }}</span>
              </div>
              @if (selectedCardId() === row.cardId) {
                <div class="mt-2">
                  <app-bingo-card [card]="row.card" [drawn]="drawn()" [showNumbers]="false" />
                </div>
              }
            </div>
          </li>
        }
      </ol>
    }
  `,
})
export class LeaderboardComponent {
  readonly cards = input.required<BingoCard[]>();
  readonly drawn = input.required<number[]>();

  protected readonly selectedCardId = signal<string | null>(null);

  protected readonly rows = computed<LeaderboardRow[]>(() => {
    const drawnSet = new Set(this.drawn());
    return this.cards()
      .map((card) => {
        const cells = card.rows.flat();
        const hits = cells.filter((cell) => drawnSet.has(cell.number)).length;
        return { card, cardId: card.id.replace(/^card-/, ''), hits, total: cells.length };
      })
      .sort((a, b) => b.hits - a.hits);
  });

  toggle(cardId: string): void {
    this.selectedCardId.set(this.selectedCardId() === cardId ? null : cardId);
  }
}
