import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BingoStateService } from '../../services/bingo-state.service';
import { BingoCardComponent } from '../bingo-card/bingo-card.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-bingo-card-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BingoCardComponent],
  template: `
    @if (state.cards().length > 0) {
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
        @for (card of visible(); track card.id; let i = $index) {
          <div class="col">
            <app-bingo-card [card]="card" [index]="i" [showTitles]="state.settings().showSongTitles" [showNumbers]="false" />
          </div>
        }
      </div>
      @if (state.cards().length > visibleCount()) {
        <button type="button" class="btn btn-outline-primary mt-3" (click)="showMore()">
          Ver más ({{ visibleCount() }} / {{ state.cards().length }})
        </button>
      }
    }
  `,
})
export class BingoCardGridComponent {
  protected readonly state = inject(BingoStateService);
  // ponytail: only render a page of cards in the DOM at a time; the PDF export
  // still uses the full state.cards() list. Upgrade to a CDK virtual-scroll
  // viewport if users routinely preview 1000+ cards on screen.
  protected readonly visibleCount = signal(PAGE_SIZE);
  protected readonly visible = computed(() => this.state.cards().slice(0, this.visibleCount()));

  showMore(): void {
    this.visibleCount.update((n) => n + PAGE_SIZE);
  }
}
