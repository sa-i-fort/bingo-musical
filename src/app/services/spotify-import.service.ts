import { Injectable } from '@angular/core';
import { Song } from '../models/bingo.models';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';
const PAGE_SIZE = 100;
const PENDING_LOGIN_KEY = 'bingo-musical:spotify-pkce-pending';

/** Thrown for any Spotify-related failure, with a message safe to show the user. */
export class SpotifyImportError extends Error {}

interface PendingLogin {
  clientId: string;
  playlistUrl: string;
  verifier: string;
  state: string;
  redirectUri: string;
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => chars[b % chars.length]).join('');
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
}

/** Loads songs from a public Spotify playlist via OAuth PKCE (no client secret, no backend). */
@Injectable({ providedIn: 'root' })
export class SpotifyImportService {
  /** Redirects the browser to Spotify's login/consent page. */
  async startLogin(clientId: string, playlistUrl: string): Promise<void> {
    const verifier = randomString(64);
    const state = randomString(16);
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
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const returnedState = url.searchParams.get('state');
    if (!code && !error) return null;

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
    // ponytail: Spotify renamed /tracks -> /items (item.item.name, not item.track.name). If broken again, check with curl.
    let url: string | null =
      `${API_BASE}/playlists/${playlistId}/items?limit=${PAGE_SIZE}&fields=next,items(item(name,artists(name)))`;

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
        const artists = (track.artists ?? []).map((a: { name: string }) => a.name).join(', ');
        songs.push({ number: songs.length + 1, title: artists ? `${track.name} - ${artists}` : track.name });
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

  private stripQueryParams(): void {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  }
}
