import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BingoCard } from '../../models/bingo.models';

interface LeaderboardRow {
  cardId: string;
  hits: number;
  total: number;
}

/** Ranks the linked cards by how many of their numbers have already been drawn. */
@Component({
  selector: 'app-leaderboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length === 0) {
      <p class="text-muted small fst-italic mb-0">No hay cartones vinculados a esta partida.</p>
    } @else {
      <ol class="list-group list-group-numbered">
        @for (row of rows(); track row.cardId) {
          <li class="list-group-item d-flex justify-content-between align-items-center">
            Cartón #{{ row.cardId }}
            <span class="badge text-bg-success rounded-pill">{{ row.hits }} / {{ row.total }}</span>
          </li>
        }
      </ol>
    }
  `,
})
export class LeaderboardComponent {
  readonly cards = input.required<BingoCard[]>();
  readonly drawn = input.required<number[]>();

  protected readonly rows = computed<LeaderboardRow[]>(() => {
    const drawnSet = new Set(this.drawn());
    return this.cards()
      .map((card) => {
        const cells = card.rows.flat();
        const hits = cells.filter((cell) => drawnSet.has(cell.number)).length;
        return { cardId: card.id.replace(/^card-/, ''), hits, total: cells.length };
      })
      .sort((a, b) => b.hits - a.hits);
  });
}
