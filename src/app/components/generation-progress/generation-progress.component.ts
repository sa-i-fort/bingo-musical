import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-generation-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.generating()) {
      <div class="progress" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" [style.width.%]="percent()"></div>
      </div>
      <p class="mt-2 mb-0">Generando cartones... {{ state.generatedCount() }} / {{ state.settings().numberOfCards }}</p>
    } @else if (state.cards().length > 0) {
      <p class="text-success mb-1">✓ {{ state.cards().length }} cartones generados correctamente</p>
      <p class="text-success mb-1">✓ Combinaciones únicas</p>
      @if (state.relaxedRules()) {
        <p class="text-warning mb-1">
          ⚠ Para conseguir el número solicitado se ha permitido alguna coincidencia de filas.
        </p>
      }
      @if (state.cards().length < state.settings().numberOfCards) {
        <p class="text-warning mb-0">
          ⚠ Se han generado {{ state.cards().length }} de {{ state.settings().numberOfCards }} cartones. No ha sido
          posible generar más sin aumentar la posibilidad de repetir combinaciones.
        </p>
      } @else {
        <p class="text-success mb-0">✓ Sin filas duplicadas</p>
      }
    }
  `,
})
export class GenerationProgressComponent {
  protected readonly state = inject(BingoStateService);
  protected readonly percent = computed(() => {
    const total = this.state.settings().numberOfCards || 1;
    return Math.round((this.state.generatedCount() / total) * 100);
  });
}
