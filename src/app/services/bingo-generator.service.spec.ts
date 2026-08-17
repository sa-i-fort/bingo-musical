import { TestBed } from '@angular/core/testing';
import { BingoGeneratorService } from './bingo-generator.service';
import { BingoSettings, Song } from '../models/bingo.models';
import { cardKey, rowKeys, toNumberGrid } from '../utils/card-comparison.util';

function makeSongs(total: number): Song[] {
  return Array.from({ length: total }, (_, i) => ({ number: i + 1, title: `Song ${i + 1}` }));
}

describe('BingoGeneratorService', () => {
  let service: BingoGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BingoGeneratorService);
  });

  it('generates the requested number of unique cards with no duplicate numbers per card', async () => {
    const settings: BingoSettings = { totalSongs: 90, rows: 3, columns: 5, numberOfCards: 20, showSongTitles: true };
    const result = await service.generate(settings, makeSongs(90));

    expect(result.cards.length).toBe(20);

    const keys = new Set<string>();
    for (const card of result.cards) {
      const grid = toNumberGrid(card);
      const flat = grid.flat();
      expect(new Set(flat).size).toBe(flat.length); // no duplicate numbers within a card

      const key = cardKey(grid);
      expect(keys.has(key)).toBe(false); // no duplicate cards
      keys.add(key);
    }
  });

  it('respects column ranges', async () => {
    const settings: BingoSettings = { totalSongs: 90, rows: 3, columns: 5, numberOfCards: 5, showSongTitles: false };
    const result = await service.generate(settings, makeSongs(90));

    for (const card of result.cards) {
      card.rows.forEach((row) => {
        row.forEach((cell, colIndex) => {
          const start = colIndex * 18 + 1;
          const end = start + 17;
          expect(cell.number).toBeGreaterThanOrEqual(start);
          expect(cell.number).toBeLessThanOrEqual(end);
        });
      });
    }
  });

  it('never loops forever and reports a partial result for impossible configurations', async () => {
    // Only 15 songs but rows=3/columns=5 needs 15 numbers per card and 50 cards requested:
    // duplicate cards become unavoidable quickly, generation must stop gracefully.
    const settings: BingoSettings = { totalSongs: 15, rows: 3, columns: 5, numberOfCards: 50, showSongTitles: false };
    const result = await service.generate(settings, makeSongs(15));

    expect(result.cards.length).toBeLessThanOrEqual(50);
    expect(result.cards.length).toBeGreaterThan(0);
  });

  it('avoids repeating rows across cards when possible', async () => {
    const settings: BingoSettings = { totalSongs: 90, rows: 3, columns: 5, numberOfCards: 10, showSongTitles: false };
    const result = await service.generate(settings, makeSongs(90));

    const seenRows = new Set<string>();
    let collisions = 0;
    for (const card of result.cards) {
      const grid = toNumberGrid(card);
      rowKeys(grid).forEach((key) => {
        if (seenRows.has(key)) collisions++;
        seenRows.add(key);
      });
    }
    expect(collisions).toBe(0);
  });
});
