import { ColumnRange } from '../models/bingo.models';

/**
 * Distributes `total` numbers as evenly as possible across `columns` ranges,
 * in ascending order (e.g. 100 songs / 6 columns -> sizes 17,17,17,17,16,16).
 */
export function computeColumnRanges(total: number, columns: number): ColumnRange[] {
  if (columns <= 0 || total <= 0) return [];
  const base = Math.floor(total / columns);
  const remainder = total % columns;
  const ranges: ColumnRange[] = [];
  let start = 1;
  for (let i = 0; i < columns; i++) {
    const size = base + (i < remainder ? 1 : 0);
    const end = start + size - 1;
    ranges.push({ start, end });
    start = end + 1;
  }
  return ranges;
}
