export interface Song {
  number: number;
  title: string;
  /** Only set when imported from Spotify; required to start a live game (embedded player needs a track id). */
  spotifyId?: string;
  image?: string;
}

export interface CsvIssue {
  message: string;
  row?: number;
}

export interface CsvParseResult {
  songs: Song[];
  errors: CsvIssue[];
  duplicateNumbers: number[];
  numberColumn: string | null;
  titleColumn: string | null;
  availableColumns: string[];
}

export interface BingoCell {
  number: number;
  title: string;
}

export interface BingoCard {
  id: string;
  rows: BingoCell[][];
}

export interface BingoSettings {
  totalSongs: number;
  rows: number;
  columns: number;
  numberOfCards: number;
  showSongTitles: boolean;
}

export interface PdfSettings {
  format: 'A4';
  showCardNumber: boolean;
}

export interface GenerationProgress {
  generated: number;
  requested: number;
  relaxed: boolean;
  done: boolean;
}

export interface GenerationResult {
  cards: BingoCard[];
  requested: number;
  relaxed: boolean;
}

export type ColumnRange = { start: number; end: number };
