import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';

/** Minimal shape of the controller Spotify's iFrame API hands back — see loadEntity/play below. */
interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  addListener(event: 'ready', cb: () => void): void;
}

interface SpotifyIframeApi {
  createController(
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void,
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

// ponytail: module-level singleton — the iFrame API script + its onSpotifyIframeApiReady callback
// are global by Spotify's design (one script tag, one ready callback for the whole page), so this
// mirrors that instead of pretending it's per-component state.
let iframeApiScriptLoading: Promise<SpotifyIframeApi> | null = null;

function loadIframeApi() {
  iframeApiScriptLoading ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.body.appendChild(script);
  });
  return iframeApiScriptLoading;
}

/**
 * Spotify's iFrame API embed — used (instead of the plain iframe src) because only this API
 * exposes a `play()` call; the embed's URL has no `autoplay` query param that actually works.
 */
@Component({
  selector: 'app-spotify-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host></div>`,
})
export class SpotifyEmbedComponent implements AfterViewInit, OnDestroy {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private controller: SpotifyEmbedController | null = null;
  private viewReady = false;

  readonly spotifyId = input<string | null>(null);
  /** Bump this to force the embed to (re)load and autoplay the current track, even on a repeat. */
  readonly reloadTick = input(0);

  constructor() {
    effect(() => {
      const id = this.spotifyId();
      this.reloadTick();
      if (this.viewReady) void this.loadCurrentTrack(id);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.viewReady = true;
    await this.loadCurrentTrack(this.spotifyId());
  }

  ngOnDestroy(): void {
    this.controller = null;
  }

  private async loadCurrentTrack(id: string | null): Promise<void> {
    if (!id) return;
    const uri = `spotify:track:${id}`;
    if (this.controller) {
      this.controller.loadUri(uri);
      this.controller.play();
      return;
    }
    const api = await loadIframeApi();
    api.createController(this.host().nativeElement, { uri, width: '100%', height: 152 }, (controller) => {
      this.controller = controller;
      controller.addListener('ready', () => controller.play());
    });
  }
}
