import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BingoStateService } from '../../services/bingo-state.service';

@Component({
  selector: 'app-generation-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.generating()) {
      <div class="progress" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100">
        <div class="bar" [style.width.%]="percent()"></div>
      </div>
      <p>Generando cartones... {{ state.generatedCount() }} / {{ state.settings().numberOfCards }}</p>
    } @else if (state.cards().length > 0) {
      <p class="ok">✓ {{ state.cards().length }} cartones generados correctamente</p>
      <p class="ok">✓ Combinaciones únicas</p>
      @if (state.relaxedRules()) {
        <p class="warning">
          ⚠ Para conseguir el número solicitado se ha permitido alguna coincidencia de filas.
        </p>
      }
      @if (state.cards().length < state.settings().numberOfCards) {
        <p class="warning">
          ⚠ Se han generado {{ state.cards().length }} de {{ state.settings().numberOfCards }} cartones. No ha sido
          posible generar más sin aumentar la posibilidad de repetir combinaciones.
        </p>
      } @else {
        <p class="ok">✓ Sin filas duplicadas</p>
      }
    }
  `,
  styles: `
    .progress {
      background: var(--border);
      border-radius: 4px;
      height: 0.75rem;
      overflow: hidden;
    }
    .bar {
      background: var(--accent);
      height: 100%;
      transition: width 0.15s ease;
    }
    .ok {
      color: var(--success);
    }
    .warning {
      color: var(--warning);
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
