import { Injectable } from '@angular/core';
import { Song } from '../models/bingo.models';
import { codeChallengeFor, randomState, randomVerifier } from '../utils/pkce.util';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';
const PAGE_SIZE = 100;
const PENDING_LOGIN_KEY = 'bingo-musical:spotify-pkce-pending';
/** Set by main.ts before Angular boots, to rescue Spotify's redirect query string from being
 * dropped by the Router's initial hash-location redirect. See main.ts for the full story. */
export const SPOTIFY_REDIRECT_PARAMS_KEY = 'bingo-musical:spotify-redirect-params';

/** Thrown for any Spotify-related failure, with a message safe to show the user. */
export class SpotifyImportError extends Error {}

interface PendingLogin {
  clientId: string;
  playlistUrl: string;
  verifier: string;
  state: string;
  redirectUri: string;
}

/** Loads songs from a public Spotify playlist via OAuth PKCE (no client secret, no backend). */
@Injectable({ providedIn: 'root' })
export class SpotifyImportService {
  /** Redirects the browser to Spotify's login/consent page. */
  async startLogin(clientId: string, playlistUrl: string): Promise<void> {
    const verifier = randomVerifier();
    const state = randomState();
    const redirectUri = window.location.origin + window.location.pathname;

    const pending: PendingLogin = { clientId, playlistUrl, verifier, state, redirectUri };
    sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(pending));

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: await codeChallengeFor(verifier),
      state,
    });
    window.location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
  }

  /** Completes the login on redirect (`?code=...`); returns imported songs, or null if not a redirect. */
  async consumeLoginRedirect(): Promise<Song[] | null> {
    const raw = sessionStorage.getItem(SPOTIFY_REDIRECT_PARAMS_KEY);
    sessionStorage.removeItem(SPOTIFY_REDIRECT_PARAMS_KEY);
    if (!raw) return null;

    const params = new URLSearchParams(raw);
    const code = params.get('code');
    const error = params.get('error');
    const returnedState = params.get('state');
    if (!code && !error) return null;

    const rawPending = sessionStorage.getItem(PENDING_LOGIN_KEY);
    sessionStorage.removeItem(PENDING_LOGIN_KEY);

    if (error) throw new SpotifyImportError('Acceso a Spotify cancelado o denegado.');
    if (!rawPending) throw new SpotifyImportError('La sesión de login con Spotify ha expirado. Inténtalo de nuevo.');

    const pending = JSON.parse(rawPending) as PendingLogin;
    if (pending.state !== returnedState) {
      throw new SpotifyImportError('No se pudo validar la respuesta de Spotify (estado inválido).');
    }

    const accessToken = await this.exchangeCodeForToken(code!, pending);
    return this.fetchPlaylistSongs(pending.playlistUrl, accessToken);
  }

  private async exchangeCodeForToken(code: string, pending: PendingLogin): Promise<string> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: pending.redirectUri,
        client_id: pending.clientId,
        code_verifier: pending.verifier,
      }).toString(),
    });
    if (!response.ok) {
      throw new SpotifyImportError('No se pudo completar el login con Spotify. Revisa el Client ID.');
    }
    const data = await response.json();
    return data.access_token as string;
  }

  private async fetchPlaylistSongs(playlistUrlOrId: string, accessToken: string): Promise<Song[]> {
    const playlistId = this.extractPlaylistId(playlistUrlOrId);
    const songs: Song[] = [];
    const seenIds = new Set<string>();
    // ponytail: Spotify renamed /tracks -> /items (item.item.name, not item.track.name). If broken again, check with curl.
    let url: string | null =
      `${API_BASE}/playlists/${playlistId}/items?limit=${PAGE_SIZE}&fields=next,items(item(id,name,artists(name),album(images)))`;

    while (url) {
      const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (response.status === 404) {
        throw new SpotifyImportError('Playlist no encontrada. Comprueba que la URL es correcta y que es pública.');
      }
      if (!response.ok) {
        throw new SpotifyImportError('No se pudo leer la playlist de Spotify.');
      }
      const page = await response.json();
      for (const item of page.items ?? []) {
        const track = item.item;
        if (!track?.name) continue;
        if (track.id && seenIds.has(track.id)) continue;
        if (track.id) seenIds.add(track.id);
        const artists = (track.artists ?? []).map((a: { name: string }) => a.name).join(', ');
        songs.push({
          number: songs.length + 1,
          title: artists ? `${track.name} - ${artists}` : track.name,
          spotifyId: track.id,
          image: track.album?.images?.[0]?.url,
        });
      }
      url = page.next;
    }

    if (songs.length === 0) {
      throw new SpotifyImportError('La playlist no tiene canciones válidas.');
    }
    return songs;
  }

  private extractPlaylistId(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/playlist[/:]([a-zA-Z0-9]+)/);
    return match ? match[1] : trimmed;
  }
}
