import { Injectable, signal } from '@angular/core';
import { BingoCard, BingoSettings, CsvIssue, PdfSettings, Song } from '../models/bingo.models';

/** Root-level state holder using signals: single linear flow, no NgRx needed. */
@Injectable({ providedIn: 'root' })
export class BingoStateService {
  readonly songs = signal<Song[]>([]);
  readonly csvErrors = signal<CsvIssue[]>([]);
  readonly csvWarnings = signal<CsvIssue[]>([]);
  readonly csvValid = signal(false);

  readonly settings = signal<BingoSettings>({
    totalSongs: 90,
    rows: 3,
    columns: 5,
    numberOfCards: 100,
    showSongTitles: true,
  });

  readonly pdfSettings = signal<PdfSettings>({
    format: 'A4',
    showCardNumber: true,
    showSongTitles: true,
  });

  readonly cards = signal<BingoCard[]>([]);
  readonly generating = signal(false);
  readonly generatedCount = signal(0);
  readonly relaxedRules = signal(false);
}
