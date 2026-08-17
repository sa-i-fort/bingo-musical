import { Injectable } from '@angular/core';
import { CsvIssue, Song } from '../models/bingo.models';

export interface CsvValidationSummary {
  valid: boolean;
  totalSongs: number;
  minNumber: number;
  maxNumber: number;
  validCount: number;
  duplicateCount: number;
  errors: CsvIssue[];
  warnings: CsvIssue[];
}

/** Validates already-parsed songs (duplicates, empty titles and range vs. configured total). */
@Injectable({ providedIn: 'root' })
export class CsvValidationService {
  validate(songs: Song[], duplicateNumbers: number[], parseErrors: CsvIssue[], totalSongs?: number): CsvValidationSummary {
    const errors: CsvIssue[] = [...parseErrors];
    const warnings: CsvIssue[] = [];

    if (songs.length === 0) {
      errors.push({ message: 'No se han encontrado canciones válidas en el CSV.' });
    }
    if (duplicateNumbers.length > 0) {
      errors.push({ message: `Números duplicados detectados: ${duplicateNumbers.join(', ')}.` });
    }

    const numbers = songs.map((s) => s.number);
    const minNumber = numbers.length ? Math.min(...numbers) : 0;
    const maxNumber = numbers.length ? Math.max(...numbers) : 0;

    if (totalSongs && numbers.some((n) => n < 1 || n > totalSongs)) {
      warnings.push({
        message: `Existen números fuera del rango 1-${totalSongs} configurado.`,
      });
    }

    return {
      valid: errors.length === 0,
      totalSongs: totalSongs ?? maxNumber,
      minNumber,
      maxNumber,
      validCount: songs.length,
      duplicateCount: duplicateNumbers.length,
      errors,
      warnings,
    };
  }
}
