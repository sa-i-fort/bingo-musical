import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import { CsvParseResult, Song } from '../models/bingo.models';

const NUMBER_ALIASES = ['numero', 'número', 'number', 'num', 'no', 'id'];
const TITLE_ALIASES = ['cancion', 'canción', 'titulo', 'título', 'title', 'song', 'nombre'];

function normalize(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Reads a CSV and turns it into `Song[]`; delimiter/quoting handled by Papa Parse. */
@Injectable({ providedIn: 'root' })
export class CsvParserService {
  parse(csvText: string, numberColumn?: string, titleColumn?: string): CsvParseResult {
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: '', // auto-detect , or ;
    });

    const fields = parsed.meta.fields ?? [];
    const detectedNumberCol = numberColumn ?? fields.find((f) => NUMBER_ALIASES.includes(normalize(f))) ?? null;
    const detectedTitleCol = titleColumn ?? fields.find((f) => TITLE_ALIASES.includes(normalize(f))) ?? null;

    const result: CsvParseResult = {
      songs: [],
      errors: [],
      duplicateNumbers: [],
      numberColumn: detectedNumberCol,
      titleColumn: detectedTitleCol,
      availableColumns: fields,
    };

    if (!detectedNumberCol || !detectedTitleCol) {
      result.errors.push({
        message: 'No se pudo detectar automáticamente la columna de número y/o de canción.',
      });
      return result;
    }

    const seenNumbers = new Set<number>();
    const duplicates = new Set<number>();

    parsed.data.forEach((row, index) => {
      const rawNumber = row[detectedNumberCol]?.trim();
      const rawTitle = row[detectedTitleCol]?.trim();
      const rowNumber = index + 2; // +1 header, +1 to be 1-based

      if (rawNumber === undefined || rawNumber === '') {
        result.errors.push({ message: 'Fila sin número.', row: rowNumber });
        return;
      }
      const number = Number(rawNumber);
      if (!Number.isFinite(number) || !Number.isInteger(number)) {
        result.errors.push({ message: `Número inválido: "${rawNumber}".`, row: rowNumber });
        return;
      }
      if (!rawTitle) {
        result.errors.push({ message: `Canción vacía para el número ${number}.`, row: rowNumber });
        return;
      }
      if (seenNumbers.has(number)) {
        duplicates.add(number);
      }
      seenNumbers.add(number);

      const song: Song = { number, title: rawTitle };
      result.songs.push(song);
    });

    result.duplicateNumbers = Array.from(duplicates).sort((a, b) => a - b);
    return result;
  }
}
