/** Fisher-Yates shuffle, returns a new shuffled array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Picks `count` random items from `items` without replacement. */
export function pickRandom<T>(items: readonly T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}
