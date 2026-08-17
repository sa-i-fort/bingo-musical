import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BingoStateService } from './services/bingo-state.service';
import { BingoGeneratorService } from './services/bingo-generator.service';
import { BingoValidationService } from './services/bingo-validation.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { CsvUploaderComponent } from './components/csv-uploader/csv-uploader.component';
import { CsvPreviewComponent } from './components/csv-preview/csv-preview.component';
import { BingoSettingsComponent } from './components/bingo-settings/bingo-settings.component';
import { BingoCardGridComponent } from './components/bingo-card-grid/bingo-card-grid.component';
import { GenerationProgressComponent } from './components/generation-progress/generation-progress.component';
import { PdfSettingsComponent } from './components/pdf-settings/pdf-settings.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CsvUploaderComponent,
    CsvPreviewComponent,
    BingoSettingsComponent,
    BingoCardGridComponent,
    GenerationProgressComponent,
    PdfSettingsComponent,
  ],
  template: `
    <header class="app-header">
      <h1>🎵 Bingo Musical</h1>
      <p>Generador de cartones para imprimir</p>
      <p class="privacy">🔒 Tus datos se procesan localmente en tu navegador. El CSV no se sube a ningún servidor.</p>
    </header>

    <main>
      <section class="panel">
        <h2>1. Cargar canciones</h2>
        <app-csv-uploader />
        <app-csv-preview />
      </section>

      <section class="panel">
        <h2>2. Configuración</h2>
        <app-bingo-settings />
      </section>

      <section class="panel">
        <h2>3. Generar</h2>
        @if (validationErrors().length) {
          <ul class="errors">
            @for (e of validationErrors(); track $index) {
              <li>{{ e }}</li>
            }
          </ul>
        }
        <button type="button" [disabled]="!canGenerate()" (click)="generate()">
          {{ state.cards().length ? '↻ REGENERAR CARTONES' : 'GENERAR CARTONES' }}
        </button>
        <app-generation-progress />
      </section>

      @if (state.cards().length > 0) {
        <section class="panel">
          <h2>4. Resultado</h2>
          <app-pdf-settings />
          <button type="button" (click)="downloadPdf()">⬇ DESCARGAR PDF</button>
          <app-bingo-card-grid />
        </section>
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
      max-width: 960px;
      margin: 0 auto;
      padding: 1rem;
    }
    .app-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .privacy {
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .panel {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    button {
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-weight: 600;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .errors {
      color: var(--danger);
    }
  `,
})
export class App {
  protected readonly state = inject(BingoStateService);
  private readonly generator = inject(BingoGeneratorService);
  private readonly settingsValidator = inject(BingoValidationService);
  private readonly pdfGenerator = inject(PdfGeneratorService);

  protected readonly validationErrors = computed(
    () => this.settingsValidator.validate(this.state.settings(), this.state.songs()).errors,
  );
  protected readonly canGenerate = computed(() => this.validationErrors().length === 0 && !this.state.generating());

  async generate(): Promise<void> {
    this.state.generating.set(true);
    this.state.generatedCount.set(0);
    this.state.cards.set([]);
    const result = await this.generator.generate(this.state.settings(), this.state.songs(), (progress) => {
      this.state.generatedCount.set(progress.generated);
      this.state.relaxedRules.set(progress.relaxed);
    });
    this.state.cards.set(result.cards);
    this.state.generating.set(false);
  }

  downloadPdf(): void {
    const settings = this.state.settings();
    this.pdfGenerator.download(this.state.cards(), this.state.pdfSettings(), settings.rows, settings.columns);
  }
}
