import { Injectable } from '@angular/core';
import { GameTrack } from '../models/juego.models';
import { codeChallengeFor, randomState, randomVerifier } from '../utils/pkce.util';
import { SpotifyImportError } from './spotify-import.service';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';
const PAGE_SIZE = 100;
const SCOPE = 'user-modify-playback-state playlist-read-private';
const TOKEN_KEY = 'bingo-musical:game-spotify-token';
const PENDING_LOGIN_KEY = 'bingo-musical:game-spotify-pkce-pending';

interface PendingLogin {
  clientId: string;
  verifier: string;
  state: string;
  redirectUri: string;
}

/**
 * Spotify OAuth + playback for the "juego" (director) view. Separate from
 * SpotifyImportService because it needs the `user-modify-playback-state`
 * scope and persists the token to control playback across draws.
 * ponytail: no refresh-token handling, matches the original tool — a 401 just
 * clears the token and asks to reconnect.
 */
@Injectable({ providedIn: 'root' })
export class GameSpotifyService {
  get accessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get connected(): boolean {
    return !!this.accessToken;
  }

  disconnect(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  async startLogin(clientId: string): Promise<void> {
    const verifier = randomVerifier();
    const state = randomState();
    const redirectUri = window.location.origin + window.location.pathname;

    const pending: PendingLogin = { clientId, verifier, state, redirectUri };
    sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(pending));

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPE,
      code_challenge_method: 'S256',
      code_challenge: await codeChallengeFor(verifier),
      state,
    });
    window.location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
  }

  /** Completes the login on redirect (`?code=...`); returns true if this was a redirect. */
  async consumeLoginRedirect(): Promise<boolean> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const returnedState = url.searchParams.get('state');
    if (!code && !error) return false;

    const raw = sessionStorage.getItem(PENDING_LOGIN_KEY);
    sessionStorage.removeItem(PENDING_LOGIN_KEY);
    this.stripQueryParams();

    if (error) throw new SpotifyImportError('Acceso a Spotify cancelado o denegado.');
    if (!raw) throw new SpotifyImportError('La sesión de login con Spotify ha expirado. Inténtalo de nuevo.');

    const pending = JSON.parse(raw) as PendingLogin;
    if (pending.state !== returnedState) {
      throw new SpotifyImportError('No se pudo validar la respuesta de Spotify (estado inválido).');
    }

    const accessToken = await this.exchangeCodeForToken(code!, pending);
    localStorage.setItem(TOKEN_KEY, accessToken);
    return true;
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

  /** Fetches playlist tracks with cover art and playback URI, in playlist order (caller shuffles/numbers them). */
  async fetchPlaylistTracks(playlistUrlOrId: string): Promise<GameTrack[]> {
    const accessToken = this.accessToken;
    if (!accessToken) throw new SpotifyImportError('Conecta primero con Spotify.');

    const playlistId = this.extractPlaylistId(playlistUrlOrId);
    const tracks: GameTrack[] = [];
    const seenUris = new Set<string>();
    let url: string | null =
      `${API_BASE}/playlists/${playlistId}/items?limit=${PAGE_SIZE}&fields=next,items(item(name,uri,artists(name),album(images)))`;

    while (url) {
      const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (response.status === 401) {
        this.disconnect();
        throw new SpotifyImportError('El token de Spotify ha caducado. Vuelve a conectar.');
      }
      if (response.status === 404) {
        throw new SpotifyImportError('Playlist no encontrada. Comprueba que la URL es correcta y que es pública.');
      }
      if (!response.ok) {
        throw new SpotifyImportError('No se pudo leer la playlist de Spotify.');
      }
      const page = await response.json();
      for (const entry of page.items ?? []) {
        const track = entry.item;
        if (!track?.name || !track?.uri) continue;
        if (seenUris.has(track.uri)) continue;
        seenUris.add(track.uri);
        tracks.push({
          name: track.name,
          artist: (track.artists ?? []).map((a: { name: string }) => a.name).join(', '),
          uri: track.uri,
          image: track.album?.images?.[0]?.url ?? '',
        });
      }
      url = page.next;
    }

    if (tracks.length === 0) {
      throw new SpotifyImportError('La playlist no tiene canciones válidas.');
    }
    return tracks;
  }

  /** Starts playback on the user's active Spotify device; falls back to opening the track URI if there is none. */
  async play(uri: string): Promise<void> {
    const accessToken = this.accessToken;
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_BASE}/me/player/play`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] }),
      });
      if (!response.ok) window.location.href = uri;
    } catch {
      window.location.href = uri;
    }
  }

  private extractPlaylistId(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/playlist[/:]([a-zA-Z0-9]+)/);
    return match ? match[1] : trimmed;
  }

  private stripQueryParams(): void {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  }
}
