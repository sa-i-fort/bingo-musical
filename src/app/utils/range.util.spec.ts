import { computeColumnRanges } from './range.util';

describe('computeColumnRanges', () => {
  it('splits evenly divisible totals into equal-size ranges', () => {
    const ranges = computeColumnRanges(90, 5);
    expect(ranges).toEqual([
      { start: 1, end: 18 },
      { start: 19, end: 36 },
      { start: 37, end: 54 },
      { start: 55, end: 72 },
      { start: 73, end: 90 },
    ]);
  });

  it('balances remainder across the first columns when not evenly divisible', () => {
    const ranges = computeColumnRanges(100, 6);
    const sizes = ranges.map((r) => r.end - r.start + 1);
    expect(sizes).toEqual([17, 17, 17, 17, 16, 16]);
    expect(ranges[0].start).toBe(1);
    expect(ranges[ranges.length - 1].end).toBe(100);
  });
});
