import { Injectable } from '@angular/core';
import { BingoCard, BingoSettings, GenerationProgress, GenerationResult, Song } from '../models/bingo.models';
import { computeColumnRanges } from '../utils/range.util';
import { pickRandom } from '../utils/random.util';
import { cardKey, gridDistance, rowKeys } from '../utils/card-comparison.util';

const MAX_ATTEMPTS_PER_CARD = 300;
const YIELD_EVERY = 25; // cards generated before ceding control back to the browser
// ponytail: only compare a candidate against the most recent N cards for the
// "too similar" heuristic instead of the whole history. O(1) per check instead
// of O(n). Upgrade to a full scan (or a spatial index) if similarity quality
// matters more than raw throughput for very large batches.
const SIMILARITY_WINDOW = 40;

/**
 * All bingo-card generation logic: column ranges, random picks, uniqueness of
 * cards and rows, and progressive relaxation so it can never loop forever.
 * Has no Angular/UI dependency, so it's fully unit-testable.
 */
@Injectable({ providedIn: 'root' })
export class BingoGeneratorService {
  async generate(
    settings: BingoSettings,
    songs: Song[],
    onProgress?: (progress: GenerationProgress) => void,
  ): Promise<GenerationResult> {
    const byNumber = new Map(songs.map((s) => [s.number, s]));
    const ranges = computeColumnRanges(settings.totalSongs, settings.columns);
    const columnPool = ranges.map((range) => {
      const nums: number[] = [];
      for (let n = range.start; n <= range.end; n++) if (byNumber.has(n)) nums.push(n);
      return nums;
    });

    const usedCardKeys = new Set<string>();
    const usedRowKeys = new Set<string>();
    const recentGrids: number[][][] = [];
    const cards: BingoCard[] = [];
    let relaxed = false;
    let allowRowCollisions = false;

    const totalCells = settings.rows * settings.columns;
    const similarityThreshold = Math.max(1, Math.floor(totalCells * 0.2));

    const generateCandidateGrid = (): number[][] | null => {
      const columnPicks = columnPool.map((pool) => (pool.length >= settings.rows ? pickRandom(pool, settings.rows) : null));
      if (columnPicks.some((pick) => pick === null)) return null;
      const grid: number[][] = [];
      for (let r = 0; r < settings.rows; r++) {
        grid.push(columnPicks.map((pick) => pick![r]));
      }
      return grid;
    };

    for (let cardIndex = 0; cardIndex < settings.numberOfCards; cardIndex++) {
      let accepted: number[][] | null = null;
      let attemptBudget = MAX_ATTEMPTS_PER_CARD;

      while (attemptBudget > 0) {
        attemptBudget--;
        const grid = generateCandidateGrid();
        if (!grid) break; // impossible configuration, no point retrying

        const key = cardKey(grid);
        if (usedCardKeys.has(key)) continue;

        const keys = rowKeys(grid);
        if (!allowRowCollisions && keys.some((k) => usedRowKeys.has(k))) continue;

        const tooSimilar =
          !allowRowCollisions &&
          recentGrids.slice(-SIMILARITY_WINDOW).some((other) => gridDistance(grid, other) < similarityThreshold);
        if (tooSimilar) continue;

        accepted = grid;
        break;
      }

      if (!accepted && !allowRowCollisions) {
        // Level 1 exhausted: relax to level 2 (allow row collisions) and retry this same card.
        allowRowCollisions = true;
        relaxed = true;
        attemptBudget = MAX_ATTEMPTS_PER_CARD;
        while (attemptBudget > 0) {
          attemptBudget--;
          const grid = generateCandidateGrid();
          if (!grid) break;
          const key = cardKey(grid);
          if (usedCardKeys.has(key)) continue;
          accepted = grid;
          break;
        }
      }

      if (!accepted) {
        // Level 3: give up gracefully, report how many were actually generated.
        break;
      }

      usedCardKeys.add(cardKey(accepted));
      rowKeys(accepted).forEach((k) => usedRowKeys.add(k));
      recentGrids.push(accepted);

      cards.push({
        id: `card-${cardIndex + 1}`,
        rows: accepted.map((row) => row.map((number) => ({ number, title: byNumber.get(number)!.title }))),
      });

      onProgress?.({ generated: cards.length, requested: settings.numberOfCards, relaxed, done: false });

      if (cards.length % YIELD_EVERY === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    onProgress?.({ generated: cards.length, requested: settings.numberOfCards, relaxed, done: true });
    return { cards, requested: settings.numberOfCards, relaxed };
  }
}
