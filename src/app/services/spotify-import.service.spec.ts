import { TestBed } from '@angular/core/testing';
import { SpotifyImportService } from './spotify-import.service';

describe('SpotifyImportService', () => {
  let service: SpotifyImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpotifyImportService);
  });

  it('extracts the playlist id from a full open.spotify.com URL', () => {
    const id = (service as unknown as { extractPlaylistId(v: string): string }).extractPlaylistId(
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123',
    );
    expect(id).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });

  it('accepts a bare playlist id', () => {
    const id = (service as unknown as { extractPlaylistId(v: string): string }).extractPlaylistId(
      '37i9dQZF1DXcBWIGoYBM5M',
    );
    expect(id).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });

  it('extracts the id from a spotify: URI', () => {
    const id = (service as unknown as { extractPlaylistId(v: string): string }).extractPlaylistId(
      'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
    );
    expect(id).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });
});
