import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { SPOTIFY_REDIRECT_PARAMS_KEY } from './app/services/spotify-import.service';

// ponytail: with hash routing, the Router's initial redirect (''->'generador') rewrites the URL
// and drops any real query string (?code=...) that Spotify appends on login redirect, before any
// component gets to read it. Stash it here, before Angular even boots, then strip it from the URL.
const url = new URL(window.location.href);
if (url.searchParams.has('code') || url.searchParams.has('error')) {
  sessionStorage.setItem(SPOTIFY_REDIRECT_PARAMS_KEY, url.search);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
