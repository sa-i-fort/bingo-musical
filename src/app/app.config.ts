import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  // ponytail: hash location because GitHub Pages can't rewrite deep links
  // (e.g. /juego/ABCDE) to index.html — hash routing needs no server support.
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes, withHashLocation())],
};
