import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-bingo-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="settings-grid">
      <label for="totalSongs">Total de canciones</label>
      <input id="totalSongs" type="number" min="1" formControlName="totalSongs" />

      <label for="rows">Filas</label>
      <input id="rows" type="number" min="1" formControlName="rows" />

      <label for="columns">Columnas</label>
      <input id="columns" type="number" min="1" formControlName="columns" />

      <label for="numberOfCards">Número de cartones</label>
      <input id="numberOfCards" type="number" min="1" formControlName="numberOfCards" />

      <label for="showSongTitles">Mostrar nombres de canciones</label>
      <input id="showSongTitles" type="checkbox" formControlName="showSongTitles" />
    </form>
  `,
  styles: `
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem 1rem;
      align-items: center;
    }
    input[type='number'] {
      width: 6rem;
    }
  `,
})
export class BingoSettingsComponent {
  protected readonly state = inject(BingoStateService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = this.fb.nonNullable.group({
    totalSongs: this.state.settings().totalSongs,
    rows: this.state.settings().rows,
    columns: this.state.settings().columns,
    numberOfCards: this.state.settings().numberOfCards,
    showSongTitles: this.state.settings().showSongTitles,
  });

  constructor() {
    const sub = this.form.valueChanges.subscribe((value) => {
      this.state.settings.set({
        totalSongs: Number(value.totalSongs) || 0,
        rows: Number(value.rows) || 0,
        columns: Number(value.columns) || 0,
        numberOfCards: Number(value.numberOfCards) || 0,
        showSongTitles: !!value.showSongTitles,
      });
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }
}
