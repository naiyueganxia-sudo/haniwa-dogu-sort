import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG as C } from '../src/core/config';
import { isMilestone, multiplierFor, pointsFor } from '../src/core/scoring';

describe('倍率と得点（C-25, C-26, D-04）', () => {
  it.each([
    [0, 1.0], [1, 1.0], [9, 1.0], [10, 1.2], [19, 1.2], [20, 1.5], [39, 1.5],
    [40, 2.0], [69, 2.0], [70, 2.5], [99, 2.5], [100, 3.0], [500, 3.0],
  ])('コンボ %i → 倍率 %f', (combo, mult) => {
    expect(multiplierFor(combo, C)).toBe(mult);
  });

  it('得点は 100 × 倍率の整数', () => {
    expect(pointsFor(1, C)).toBe(100);
    expect(pointsFor(10, C)).toBe(120);
    expect(pointsFor(20, C)).toBe(150);
    expect(pointsFor(40, C)).toBe(200);
    expect(pointsFor(70, C)).toBe(250);
    expect(pointsFor(100, C)).toBe(300);
  });
});

describe('コンボの節目（D-18）', () => {
  it('10/20/40/70/100、以後50ごと', () => {
    const hits = Array.from({ length: 300 }, (_, i) => i).filter((c) => isMilestone(c, C));
    expect(hits).toEqual([10, 20, 40, 70, 100, 150, 200, 250]);
  });
});
