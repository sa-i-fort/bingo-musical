import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="bg-primary text-white text-center py-4 mb-4">
      <h1 class="h3 mb-1">🎵 Bingo Musical</h1>
      <nav class="d-flex justify-content-center gap-2 my-2">
        <a class="btn btn-sm btn-outline-light" routerLink="/generador" routerLinkActive="active">Generador</a>
        <a class="btn btn-sm btn-outline-light" routerLink="/juego" routerLinkActive="active">Juego</a>
        <a class="btn btn-sm btn-outline-light" routerLink="/mis-partidas" routerLinkActive="active">Mis partidas</a>
      </nav>
    </header>

    <main class="container pb-5">
      <router-outlet />
    </main>
  `,
})
export class App {}
