import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-bingo-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="row g-3">
      <div class="col-12">
        <label for="gameName" class="form-label">Nombre de la partida</label>
        <input
          id="gameName"
          type="text"
          class="form-control"
          formControlName="gameName"
          placeholder="p. ej. Bingo de Nochevieja"
        />
      </div>

      <div class="col-6 col-sm-4">
        <label for="rows" class="form-label">Filas</label>
        <input id="rows" type="number" min="1" class="form-control" formControlName="rows" />
      </div>

      <div class="col-6 col-sm-4">
        <label for="columns" class="form-label">Columnas</label>
        <input id="columns" type="number" min="1" class="form-control" formControlName="columns" />
      </div>

      <div class="col-6 col-sm-4">
        <label for="numberOfCards" class="form-label">Cartones</label>
        <input id="numberOfCards" type="number" min="1" class="form-control" formControlName="numberOfCards" />
      </div>
    </form>
  `,
})
export class BingoSettingsComponent {
  protected readonly state = inject(BingoStateService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  // totalSongs is derived from the imported CSV (see CsvUploaderComponent), no field here.
  protected readonly form = this.fb.nonNullable.group({
    gameName: this.state.gameName(),
    rows: this.state.settings().rows,
    columns: this.state.settings().columns,
    numberOfCards: this.state.settings().numberOfCards,
  });

  constructor() {
    // Reflects gameName being restored asynchronously from a loaded live game (see GeneradorPageComponent.ngOnInit).
    effect(() => {
      const name = this.state.gameName();
      if (name !== this.form.controls.gameName.value) this.form.controls.gameName.setValue(name, { emitEvent: false });
    });

    const sub = this.form.valueChanges.subscribe((value) => {
      this.state.gameName.set(value.gameName ?? '');
      this.state.settings.update((settings) => ({
        ...settings,
        rows: Number(value.rows) || 0,
        columns: Number(value.columns) || 0,
        numberOfCards: Number(value.numberOfCards) || 0,
      }));
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }
}
