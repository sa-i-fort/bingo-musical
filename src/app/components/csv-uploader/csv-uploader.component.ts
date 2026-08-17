import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CsvParserService } from '../../services/csv-parser.service';
import { CsvValidationService } from '../../services/csv-validation.service';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-csv-uploader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="border border-2 rounded p-4 text-center mb-2"
      [class.border-danger]="hasErrors()"
      [class.border-secondary-subtle]="!hasErrors()"
      style="border-style: dashed !important; cursor: pointer;"
      tabindex="0"
      role="button"
      aria-label="Cargar archivo CSV de canciones"
      (click)="fileInput.click()"
      (keydown.enter)="fileInput.click()"
      (dragover)="$event.preventDefault()"
      (drop)="onDrop($event)"
    >
      <input #fileInput type="file" accept=".csv,text/csv" hidden (change)="onFileSelected($event)" />
      <p class="mb-0">📄 Arrastra un CSV aquí o haz clic para seleccionarlo</p>
      @if (fileName()) {
        <p class="fw-semibold mb-0">{{ fileName() }}</p>
      }
    </div>

    @if (state.csvValid()) {
      <p class="text-success">✓ {{ state.songs().length }} canciones cargadas correctamente</p>
    }

    @if (hasErrors()) {
      <ul class="alert alert-danger">
        @for (e of state.csvErrors(); track $index) {
          <li>{{ e.message }}</li>
        }
      </ul>
    }
    @if (state.csvWarnings().length) {
      <ul class="alert alert-warning">
        @for (w of state.csvWarnings(); track $index) {
          <li>⚠ {{ w.message }}</li>
        }
      </ul>
    }
  `,
})
export class CsvUploaderComponent {
  protected readonly state = inject(BingoStateService);
  private readonly parser = inject(CsvParserService);
  private readonly validator = inject(CsvValidationService);

  protected readonly fileName = signal('');

  protected readonly hasErrors = computed(() => this.state.csvErrors().length > 0);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File): void {
    this.fileName.set(file.name);
    file.text().then((text) => {
      const parsed = this.parser.parse(text);
      const maxNumber = parsed.songs.reduce((max, s) => Math.max(max, s.number), 0);
      if (maxNumber > 0) {
        this.state.settings.update((settings) => ({ ...settings, totalSongs: maxNumber }));
      }
      const summary = this.validator.validate(
        parsed.songs,
        parsed.duplicateNumbers,
        parsed.errors,
        this.state.settings().totalSongs,
      );
      this.state.songs.set(parsed.songs);
      this.state.csvErrors.set(summary.errors);
      this.state.csvWarnings.set(summary.warnings);
      this.state.csvValid.set(summary.valid);
      this.state.cards.set([]);
    });
  }
}
