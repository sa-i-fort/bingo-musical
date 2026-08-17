import { Injectable } from '@angular/core';
import { BingoSettings, Song } from '../models/bingo.models';
import { computeColumnRanges } from '../utils/range.util';

export interface SettingsValidationResult {
  valid: boolean;
  errors: string[];
}

/** Checks whether the current settings + available songs can produce cards at all. */
@Injectable({ providedIn: 'root' })
export class BingoValidationService {
  validate(settings: BingoSettings, songs: Song[]): SettingsValidationResult {
    const errors: string[] = [];

    if (songs.length === 0) errors.push('Debes cargar un CSV con canciones válidas.');
    if (settings.rows <= 0) errors.push('El número de filas debe ser mayor que 0.');
    if (settings.columns <= 0) errors.push('El número de columnas debe ser mayor que 0.');
    if (settings.numberOfCards <= 0) errors.push('El número de cartones debe ser mayor que 0.');
    if (settings.totalSongs <= 0) errors.push('El total de canciones debe ser mayor que 0.');

    if (errors.length > 0) return { valid: false, errors };

    const ranges = computeColumnRanges(settings.totalSongs, settings.columns);
    const byNumber = new Map(songs.map((s) => [s.number, s]));

    ranges.forEach((range, i) => {
      let count = 0;
      for (let n = range.start; n <= range.end; n++) if (byNumber.has(n)) count++;
      if (count < settings.rows) {
        errors.push(
          `No hay suficientes canciones válidas para generar cartones con esta configuración (columna ${i + 1}: solo ${count} disponibles, se necesitan ${settings.rows}).`,
        );
      }
    });

    return { valid: errors.length === 0, errors };
  }
}
