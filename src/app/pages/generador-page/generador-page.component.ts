import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { BingoStateService } from '../../services/bingo-state.service';
import { BingoGeneratorService } from '../../services/bingo-generator.service';
import { BingoValidationService } from '../../services/bingo-validation.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { CsvParserService } from '../../services/csv-parser.service';
import { JuegoService } from '../../services/juego.service';
import { JuegoStateService, allSongsPlayable, gameMappingToSongs, getActiveGameCode } from '../../services/juego-state.service';
import { SPOTIFY_REDIRECT_PARAMS_KEY } from '../../services/spotify-import.service';
import { CsvUploaderComponent } from '../../components/csv-uploader/csv-uploader.component';
import { CsvPreviewComponent } from '../../components/csv-preview/csv-preview.component';
import { SpotifyImporterComponent } from '../../components/spotify-importer/spotify-importer.component';
import { BingoSettingsComponent } from '../../components/bingo-settings/bingo-settings.component';
import { BingoCardGridComponent } from '../../components/bingo-card-grid/bingo-card-grid.component';
import { GenerationProgressComponent } from '../../components/generation-progress/generation-progress.component';

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
    RouterLink,
  ],
  template: `
    @if (juegoState.game(); as game) {
      <section class="card shadow-sm mb-3 border-success">
        <div class="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 class="h6 text-uppercase text-muted mb-1">Partida en directo cargada</h2>
            <strong>{{ game.name }}</strong>
            <span class="text-muted small ms-2">
              código {{ game.code }} · {{ game.drawn.length }} / {{ game.mapping.length }} cantadas
            </span>
          </div>
          <a class="btn btn-success" [routerLink]="['/juego', game.code]">▶ Ir al juego</a>
        </div>
      </section>
    }

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
            @if (state.songs().length > 0) {
              <div class="d-flex gap-2 mt-3">
                <button type="button" class="btn btn-outline-primary" (click)="downloadSongList()">
                  ⬇ DESCARGAR PDF
                </button>
                <button type="button" class="btn btn-outline-secondary" (click)="downloadSpotifyCsv()">
                  ⬇ DESCARGAR CSV
                </button>
              </div>
            }
          </div>
        </section>
      </div>

      <div class="col-12">
        <section class="card shadow-sm">
          <div class="card-body">
            <h2 class="h5 card-title">4. Generar</h2>
            @if (juegoState.game() && !allowRegenerateWithGame()) {
              <p class="text-muted mb-2">
                Esta partida ya está en marcha; los cartones no se pueden regenerar.
              </p>
              <button type="button" class="btn btn-outline-warning btn-sm" (click)="allowRegenerateWithGame.set(true)">
                Regenerar de todas formas (reiniciaré la partida manualmente)
              </button>
            } @else {
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
            }
          </div>
        </section>
      </div>

      @if (state.cards().length > 0) {
        <div class="col-12">
          <section class="card shadow-sm">
            <div class="card-body">
              <h2 class="h5 card-title">5. Resultado</h2>
              <div class="d-flex gap-2 my-3">
                <button type="button" class="btn btn-success" (click)="downloadPdf()">⬇ DESCARGAR CARTONES</button>
              </div>
              <app-bingo-card-grid />
            </div>
          </section>
        </div>

        <div class="col-12">
          <section class="card shadow-sm">
            <div class="card-body">
              <h2 class="h5 card-title">6. Arrancar partida en directo</h2>
              @if (!songsPlayable()) {
                <p class="alert alert-warning mb-3">
                  Para arrancar una partida en directo necesitas importar las canciones desde Spotify (para poder
                  reproducirlas). Vuelve al paso 1 y usa la pestaña "Playlist de Spotify".
                </p>
              } @else {
                @if (createError()) {
                  <p class="alert alert-danger">{{ createError() }}</p>
                }
                <p class="mb-2">
                  Partida: <strong>{{ state.gameName() }}</strong>
                </p>
                <button type="button" class="btn btn-success" [disabled]="creatingGame()" (click)="startGame()">
                  ▶ Crear partida y empezar
                </button>
              }
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class GeneradorPageComponent implements OnInit {
  protected readonly state = inject(BingoStateService);
  protected readonly juegoState = inject(JuegoStateService);
  private readonly generator = inject(BingoGeneratorService);
  private readonly settingsValidator = inject(BingoValidationService);
  private readonly pdfGenerator = inject(PdfGeneratorService);
  private readonly csvExporter = inject(CsvParserService);
  private readonly juego = inject(JuegoService);
  private readonly router = inject(Router);

  // Coming back from a Spotify login redirect: default to that tab so it mounts and finishes.
  // (main.ts already moved the real query string into sessionStorage before the Router could drop it.)
  private readonly hasSpotifyRedirect = !!sessionStorage.getItem(SPOTIFY_REDIRECT_PARAMS_KEY);
  protected readonly source = signal<'csv' | 'spotify'>(this.hasSpotifyRedirect ? 'spotify' : 'csv');
  protected readonly allowRegenerateWithGame = signal(false);

  protected readonly validationErrors = computed(
    () => this.settingsValidator.validate(this.state.settings(), this.state.songs(), this.state.gameName()).errors,
  );
  protected readonly canGenerate = computed(() => this.validationErrors().length === 0 && !this.state.generating());
  protected readonly songsPlayable = computed(() => allSongsPlayable(this.state.songs()));

  protected readonly creatingGame = signal(false);
  protected readonly createError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Show the "live game" banner even if we land here without going through /juego first.
    const code = getActiveGameCode();
    if (code && !this.juegoState.game()) {
      try {
        await this.juego.loadGame(code);
      } catch {
        // No banner if the stored code no longer resolves to a real game — not worth surfacing an error here.
        return;
      }
    }
    // Cards were regenerated in this browser session already — don't clobber them with the (possibly
    // reshuffled-numbers-wise identical, but re-fetched) ones from the linked game.
    if (this.state.cards().length === 0 && this.juegoState.linkedCards().length > 0) {
      this.state.cards.set(this.juegoState.linkedCards());
    }
    if (this.state.songs().length === 0 && this.juegoState.game()) {
      this.state.songs.set(gameMappingToSongs(this.juegoState.game()!.mapping));
    }
    if (!this.state.gameName().trim() && this.juegoState.game()) {
      this.state.gameName.set(this.juegoState.game()!.name);
    }
  }

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
    this.pdfGenerator.download(this.state.cards(), settings.rows, settings.columns, this.state.gameName());
  }

  downloadSongList(): void {
    this.pdfGenerator.downloadSongList(this.state.songs(), this.state.gameName());
  }

  downloadSpotifyCsv(): void {
    this.csvExporter.downloadSpotifyCsv(this.state.songs(), this.state.gameName());
  }

  async startGame(): Promise<void> {
    this.creatingGame.set(true);
    this.createError.set(null);
    try {
      const code = await this.juego.createGame(this.state.gameName().trim(), this.state.songs(), this.state.cards());
      await this.router.navigate(['/juego', code]);
    } catch (error) {
      this.createError.set((error as Error).message);
    } finally {
      this.creatingGame.set(false);
    }
  }
}
