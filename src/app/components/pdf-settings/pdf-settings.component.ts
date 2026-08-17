import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-pdf-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="row g-3 mb-2">
      <div class="col-12 col-sm-6">
        <label for="pdfTitle" class="form-label">Título del bingo</label>
        <input id="pdfTitle" type="text" class="form-control" formControlName="title" />
      </div>

      <div class="col-12 col-sm-6">
        <fieldset>
          <legend class="form-label col-form-label pt-0">Orientación</legend>
          <div class="form-check form-check-inline">
            <input id="orAuto" class="form-check-input" type="radio" formControlName="orientation" value="auto" />
            <label class="form-check-label" for="orAuto">Automática</label>
          </div>
          <div class="form-check form-check-inline">
            <input
              id="orPortrait"
              class="form-check-input"
              type="radio"
              formControlName="orientation"
              value="portrait"
            />
            <label class="form-check-label" for="orPortrait">Vertical</label>
          </div>
          <div class="form-check form-check-inline">
            <input
              id="orLandscape"
              class="form-check-input"
              type="radio"
              formControlName="orientation"
              value="landscape"
            />
            <label class="form-check-label" for="orLandscape">Horizontal</label>
          </div>
        </fieldset>
      </div>

      <div class="col-12 col-sm-6">
        <div class="form-check">
          <input id="showCardNumber" type="checkbox" class="form-check-input" formControlName="showCardNumber" />
          <label for="showCardNumber" class="form-check-label">Mostrar número de cartón</label>
        </div>
      </div>

      <div class="col-12 col-sm-6">
        <div class="form-check">
          <input
            id="showSongTitlesPdf"
            type="checkbox"
            class="form-check-input"
            formControlName="showSongTitles"
          />
          <label for="showSongTitlesPdf" class="form-check-label">Mostrar nombre de canción</label>
        </div>
      </div>
    </form>
  `,
})
export class PdfSettingsComponent {
  private readonly state = inject(BingoStateService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = this.fb.nonNullable.group({
    title: this.state.pdfSettings().title,
    orientation: this.state.pdfSettings().orientation,
    showCardNumber: this.state.pdfSettings().showCardNumber,
    showSongTitles: this.state.pdfSettings().showSongTitles,
  });

  constructor() {
    const sub = this.form.valueChanges.subscribe((value) => {
      this.state.pdfSettings.set({
        format: 'A4',
        cardsPerPage: 'auto',
        title: value.title ?? 'BINGO MUSICAL',
        orientation: value.orientation ?? 'auto',
        showCardNumber: !!value.showCardNumber,
        showSongTitles: !!value.showSongTitles,
      });
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }
}
