import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-pdf-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="pdf-settings">
      <label for="pdfTitle">Título del bingo</label>
      <input id="pdfTitle" type="text" formControlName="title" />

      <fieldset>
        <legend>Orientación</legend>
        <label><input type="radio" formControlName="orientation" value="auto" /> Automática</label>
        <label><input type="radio" formControlName="orientation" value="portrait" /> Vertical</label>
        <label><input type="radio" formControlName="orientation" value="landscape" /> Horizontal</label>
      </fieldset>

      <label for="showCardNumber">Mostrar número de cartón</label>
      <input id="showCardNumber" type="checkbox" formControlName="showCardNumber" />

      <label for="showSongTitlesPdf">Mostrar nombre de canción</label>
      <input id="showSongTitlesPdf" type="checkbox" formControlName="showSongTitles" />
    </form>
  `,
  styles: `
    .pdf-settings {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem 1rem;
      align-items: center;
    }
    fieldset {
      grid-column: 1 / -1;
      display: flex;
      gap: 1rem;
      border: none;
      padding: 0;
    }
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
