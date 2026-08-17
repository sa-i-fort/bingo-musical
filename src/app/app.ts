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
    <header class="bg-primary text-white text-center py-4 mb-4">
      <h1 class="h3 mb-1">🎵 Bingo Musical</h1>
      <p class="mb-1">Generador de cartones para imprimir</p>
      <p class="small mb-0 opacity-75">
        🔒 Tus datos se procesan localmente en tu navegador. El CSV no se sube a ningún servidor.
      </p>
    </header>

    <main class="container pb-5">
      <div class="row g-3">
        <div class="col-12 col-lg-6">
          <section class="card shadow-sm h-100">
            <div class="card-body">
              <h2 class="h5 card-title">1. Cargar canciones</h2>
              <app-csv-uploader />
              <app-csv-preview />
            </div>
          </section>
        </div>

        <div class="col-12 col-lg-6">
          <section class="card shadow-sm h-100">
            <div class="card-body">
              <h2 class="h5 card-title">2. Configuración</h2>
              <app-bingo-settings />
            </div>
          </section>
        </div>

        <div class="col-12">
          <section class="card shadow-sm">
            <div class="card-body">
              <h2 class="h5 card-title">3. Generar</h2>
              @if (validationErrors().length) {
                <ul class="alert alert-danger mb-3">
                  @for (e of validationErrors(); track $index) {
                    <li>{{ e }}</li>
                  }
                </ul>
              }
              <button type="button" class="btn btn-primary" [disabled]="!canGenerate()" (click)="generate()">
                {{ state.cards().length ? '↻ REGENERAR CARTONES' : 'GENERAR CARTONES' }}
              </button>
              <div class="mt-3">
                <app-generation-progress />
              </div>
            </div>
          </section>
        </div>

        @if (state.cards().length > 0) {
          <div class="col-12">
            <section class="card shadow-sm">
              <div class="card-body">
                <h2 class="h5 card-title">4. Resultado</h2>
                <app-pdf-settings />
                <button type="button" class="btn btn-success my-3" (click)="downloadPdf()">⬇ DESCARGAR PDF</button>
                <app-bingo-card-grid />
              </div>
            </section>
          </div>
        }
      </div>
    </main>
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
