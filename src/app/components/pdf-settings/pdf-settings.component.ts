import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-pdf-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="row g-3 mb-2">
      <div class="col-12">
        <div class="form-check">
          <input id="showCardNumber" type="checkbox" class="form-check-input" formControlName="showCardNumber" />
          <label for="showCardNumber" class="form-check-label">Mostrar número de cartón</label>
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
    showCardNumber: this.state.pdfSettings().showCardNumber,
  });

  constructor() {
    const sub = this.form.valueChanges.subscribe((value) => {
      this.state.pdfSettings.set({
        format: 'A4',
        showCardNumber: !!value.showCardNumber,
      });
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }
}
