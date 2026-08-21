import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { GameNumber } from '../../models/juego.models';

/**
 * Song list split into "ya sonadas" / "por sonar" — replaces the old 1..N number grid since
 * numbers are just an internal bookkeeping detail, not something players care about.
 * `interactive` enables per-song actions (director only); the spectator view omits them.
 */
@Component({
  selector: 'app-song-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row g-3">
      <div class="col-12 col-md-6">
        <h3 class="h6 text-uppercase text-muted">Ya han sonado ({{ played().length }})</h3>
        @if (played().length === 0) {
          <p class="text-muted fst-italic small">Todavía no ha sonado ninguna.</p>
        } @else {
          <ul class="list-group">
            @for (m of played(); track m.number) {
              <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
                <span>{{ m.track ? m.track.name + ' - ' + m.track.artist : 'Comodín' }}</span>
                @if (interactive() && m.track) {
                  <button
                    type="button"
                    class="btn btn-sm btn-light border-0"
                    title="Reproducir de nuevo"
                    (click)="replay.emit(m)"
                  >
                    🔁
                  </button>
                }
              </li>
            }
          </ul>
        }
      </div>

      <div class="col-12 col-md-6">
        <h3 class="h6 text-uppercase text-muted">Por sonar ({{ pending().length }})</h3>
        @if (pending().length === 0) {
          <p class="text-muted fst-italic small">¡No queda ninguna!</p>
        } @else {
          <ul class="list-group">
            @for (m of pending(); track m.number) {
              <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
                <span>{{ m.track ? m.track.name + ' - ' + m.track.artist : 'Comodín' }}</span>
                @if (interactive()) {
                  <button
                    type="button"
                    class="btn btn-sm btn-light border-0"
                    title="Poner como siguiente"
                    (click)="forceNext.emit(m)"
                  >
                    ⏭
                  </button>
                }
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class SongListComponent {
  readonly mapping = input.required<GameNumber[]>();
  readonly drawn = input.required<number[]>();
  readonly interactive = input(false);

  readonly replay = output<GameNumber>();
  readonly forceNext = output<GameNumber>();

  private readonly drawnSet = computed(() => new Set(this.drawn()));
  // "Ya sonadas": most recent first, following the actual draw order (not song/number order).
  protected readonly played = computed(() => {
    const byNumber = new Map(this.mapping().map((m) => [m.number, m]));
    return this.drawn()
      .slice()
      .reverse()
      .map((number) => byNumber.get(number))
      .filter((m): m is GameNumber => !!m);
  });
  // "Por sonar": alphabetical by song name (comodines, with no track, sort last).
  protected readonly pending = computed(() =>
    this.mapping()
      .filter((m) => !this.drawnSet().has(m.number))
      .sort((a, b) => (a.track?.name ?? '\uffff').localeCompare(b.track?.name ?? '\uffff')),
  );
}
