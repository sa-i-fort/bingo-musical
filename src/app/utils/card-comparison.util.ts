import { BingoCard } from '../models/bingo.models';

/** Canonical string key for a card: identical grid + position => identical key. */
export function cardKey(rows: number[][]): string {
  return rows.map((row) => row.join('-')).join('|');
}

/** One key per row, used to detect rows repeated across different cards. */
export function rowKeys(rows: number[][]): string[] {
  return rows.map((row) => row.join('-'));
}

/** Number of differing cell positions between two same-shaped grids. */
export function gridDistance(a: number[][], b: number[][]): number {
  let diff = 0;
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) diff++;
    }
  }
  return diff;
}

export function toNumberGrid(card: BingoCard): number[][] {
  return card.rows.map((row) => row.map((cell) => cell.number));
}
