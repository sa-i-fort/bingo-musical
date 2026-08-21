import { Routes } from '@angular/router';
import { GeneradorPageComponent } from './pages/generador-page/generador-page.component';
import { JuegoMenuComponent } from './pages/juego-menu/juego-menu.component';
import { JuegoAdminComponent } from './pages/juego-admin/juego-admin.component';
import { JuegoBoardComponent } from './pages/juego-board/juego-board.component';
import { JuegoEspectadorComponent } from './pages/juego-espectador/juego-espectador.component';

export const routes: Routes = [
  { path: '', redirectTo: 'generador', pathMatch: 'full' },
  { path: 'generador', component: GeneradorPageComponent },
  { path: 'juego', component: JuegoMenuComponent },
  { path: 'juego/admin', component: JuegoAdminComponent },
  { path: 'juego/:code', component: JuegoBoardComponent },
  { path: 'ver/:code', component: JuegoEspectadorComponent },
  { path: '**', redirectTo: 'generador' },
];
