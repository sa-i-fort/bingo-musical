import { Routes } from '@angular/router';
import { GeneradorPageComponent } from './pages/generador-page/generador-page.component';
import { JuegoBoardComponent } from './pages/juego-board/juego-board.component';
import { MisPartidasComponent } from './pages/mis-partidas/mis-partidas.component';

export const routes: Routes = [
  { path: '', redirectTo: 'generador', pathMatch: 'full' },
  { path: 'generador', component: GeneradorPageComponent },
  { path: 'mis-partidas', component: MisPartidasComponent },
  { path: 'juego', component: JuegoBoardComponent },
  { path: 'juego/:code', component: JuegoBoardComponent },
  { path: '**', redirectTo: 'generador' },
];
