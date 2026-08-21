import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Spotify's public embed widget (iframe) — no OAuth/playback scope needed, just a track id.
 * ponytail: browsers generally block iframe autoplay without a user gesture; the "sacar
 * siguiente" click itself is usually enough of one, but there's no guarantee across browsers.
 */
@Component({
  selector: 'app-spotify-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (embedUrl(); as url) {
      <iframe
        [src]="url"
        width="100%"
        height="152"
        style="border-radius: 12px"
        frameborder="0"
        allowfullscreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      ></iframe>
    }
  `,
})
export class SpotifyEmbedComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly spotifyId = input<string | null>(null);
  /** Bump this to force the iframe to reload the track from the start ("volver a reproducir"). */
  readonly reloadTick = input(0);

  protected readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.spotifyId();
    if (!id) return null;
    const url = `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0&_r=${this.reloadTick()}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
