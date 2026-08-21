import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BingoStateService } from '../../services/bingo-state.service';
import { BingoGeneratorService } from '../../services/bingo-generator.service';
import { BingoValidationService } from '../../services/bingo-validation.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { CsvUploaderComponent } from '../../components/csv-uploader/csv-uploader.component';
import { CsvPreviewComponent } from '../../components/csv-preview/csv-preview.component';
import { SpotifyImporterComponent } from '../../components/spotify-importer/spotify-importer.component';
import { BingoSettingsComponent } from '../../components/bingo-settings/bingo-settings.component';
import { BingoCardGridComponent } from '../../components/bingo-card-grid/bingo-card-grid.component';
import { GenerationProgressComponent } from '../../components/generation-progress/generation-progress.component';
import { PdfSettingsComponent } from '../../components/pdf-settings/pdf-settings.component';

@Component({
  selector: 'app-generador-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CsvUploaderComponent,
    CsvPreviewComponent,
    SpotifyImporterComponent,
    BingoSettingsComponent,
    BingoCardGridComponent,
    GenerationProgressComponent,
    PdfSettingsComponent,
  ],
  template: `
    <p class="small text-muted mb-3">
      🔒 Tus datos se procesan localmente en tu navegador. Nada se sube a ningún servidor propio.
    </p>
    <div class="row g-3">
      <div class="col-12 col-lg-6">
        <section class="card shadow-sm h-100">
          <div class="card-body">
            <h2 class="h5 card-title">1. Cargar canciones</h2>
            <div class="btn-group mb-3" role="group" aria-label="Fuente de canciones">
              <input
                id="sourceCsv"
                type="radio"
                class="btn-check"
                name="source"
                [checked]="source() === 'csv'"
                (change)="source.set('csv')"
              />
              <label class="btn btn-outline-primary btn-sm" for="sourceCsv">Archivo CSV</label>

              <input
                id="sourceSpotify"
                type="radio"
                class="btn-check"
                name="source"
                [checked]="source() === 'spotify'"
                (change)="source.set('spotify')"
              />
              <label class="btn btn-outline-primary btn-sm" for="sourceSpotify">Playlist de Spotify</label>
            </div>

            @if (source() === 'csv') {
              <app-csv-uploader />
            } @else {
              <app-spotify-importer />
            }
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
            <h2 class="h5 card-title">3. Listado de canciones</h2>
            <app-csv-preview />
          </div>
        </section>
      </div>

      <div class="col-12">
        <section class="card shadow-sm">
          <div class="card-body">
            <h2 class="h5 card-title">4. Generar</h2>
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
              <h2 class="h5 card-title">5. Resultado</h2>
              <app-pdf-settings />
              <div class="d-flex gap-2 my-3">
                <button type="button" class="btn btn-success" (click)="downloadPdf()">⬇ DESCARGAR CARTONES</button>
                <button type="button" class="btn btn-outline-primary" (click)="downloadSongList()">
                  ⬇ DESCARGAR LISTADO CANCIONES
                </button>
              </div>
              <app-bingo-card-grid />
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class GeneradorPageComponent {
  protected readonly state = inject(BingoStateService);
  private readonly generator = inject(BingoGeneratorService);
  private readonly settingsValidator = inject(BingoValidationService);
  private readonly pdfGenerator = inject(PdfGeneratorService);

  // Coming back from a Spotify login redirect: default to that tab so it mounts and finishes.
  private readonly hasSpotifyRedirect =
    new URLSearchParams(window.location.search).has('code') ||
    new URLSearchParams(window.location.search).has('error');
  protected readonly source = signal<'csv' | 'spotify'>(this.hasSpotifyRedirect ? 'spotify' : 'csv');

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

  downloadSongList(): void {
    this.pdfGenerator.downloadSongList(this.state.songs());
  }
}
