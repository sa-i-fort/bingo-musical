import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CsvValidationService } from '../../services/csv-validation.service';
import { BingoStateService } from '../../services/bingo-state.service';
import { SpotifyImportError, SpotifyImportService } from '../../services/spotify-import.service';
import { SPOTIFY_CLIENT_ID } from '../../spotify-client-id';

@Component({
  selector: 'app-spotify-importer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    @if (!clientIdConfigured) {
      <p class="alert alert-warning mb-2">
        La importación desde Spotify no está configurada en este despliegue (falta el Client ID).
      </p>
    } @else {
      <p class="small text-muted mb-1">
        Redirect URI registrada en el Spotify Dashboard: <code>{{ redirectUri }}</code>
      </p>
    }

    <form [formGroup]="form" class="row g-2" (ngSubmit)="login()">
      <div class="col-12">
        <label for="playlistUrl" class="form-label">URL o ID de la playlist pública</label>
        <input
          id="playlistUrl"
          type="text"
          class="form-control"
          placeholder="https://open.spotify.com/playlist/..."
          formControlName="playlistUrl"
        />
      </div>

      <div class="col-12">
        <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading() || !clientIdConfigured">
          @if (loading()) {
            Importando...
          } @else {
            Iniciar sesión con Spotify e importar
          }
        </button>
      </div>

      @if (error()) {
        <div class="col-12">
          <p class="alert alert-danger mb-0">{{ error() }}</p>
        </div>
      }
    </form>
  `,
})
export class SpotifyImporterComponent {
  protected readonly state = inject(BingoStateService);
  private readonly fb = inject(FormBuilder);
  private readonly spotify = inject(SpotifyImportService);
  private readonly validator = inject(CsvValidationService);

  protected readonly clientIdConfigured = SPOTIFY_CLIENT_ID.length > 0;
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly redirectUri = window.location.origin + window.location.pathname;

  protected readonly form = this.fb.nonNullable.group({
    playlistUrl: '',
  });

  constructor() {
    this.loading.set(true);
    this.spotify
      .consumeLoginRedirect()
      .then((songs) => {
        if (songs) this.applySongs(songs);
      })
      .catch((err) => this.setError(err))
      .finally(() => this.loading.set(false));
  }

  async login(): Promise<void> {
    if (this.form.invalid || !this.clientIdConfigured) return;
    const { playlistUrl } = this.form.getRawValue();
    this.error.set('');
    await this.spotify.startLogin(SPOTIFY_CLIENT_ID, playlistUrl);
  }

  private applySongs(songs: { number: number; title: string }[]): void {
    const maxNumber = songs.reduce((max, s) => Math.max(max, s.number), 0);
    this.state.settings.update((settings) => ({ ...settings, totalSongs: maxNumber }));

    const summary = this.validator.validate(songs, [], [], maxNumber);
    this.state.songs.set(songs);
    this.state.csvErrors.set(summary.errors);
    this.state.csvWarnings.set(summary.warnings);
    this.state.csvValid.set(summary.valid);
    this.state.cards.set([]);
  }

  private setError(err: unknown): void {
    this.error.set(err instanceof SpotifyImportError ? err.message : 'Error inesperado al importar la playlist.');
  }
}
