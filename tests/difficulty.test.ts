import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG as C, derive } from '../src/core/config';
import { interpolate, spacingFor, speedFor } from '../src/core/difficulty';

const { baseSpeed } = derive(C);

describe('難易度（D-01, 詳細設計 第4章）', () => {
  it('制御点を直線でつなぎ、範囲外は端の値', () => {
    const pts = [[0, 10], [10, 20]] as const;
    expect(interpolate(pts, -5)).toBe(10);
    expect(interpolate(pts, 5)).toBe(15);
    expect(interpolate(pts, 99)).toBe(20);
  });

  it('間隔は最小間隔を下回らない（n = 0〜5000）', () => {
    for (let n = 0; n <= 5000; n++) expect(spacingFor(n, C, baseSpeed)).toBeGreaterThanOrEqual(C.minSpacing - 1e-9);
  });

  it('B段階：速度一定で間隔が縮む／C段階：間隔は下限で速度が上がる', () => {
    expect(speedFor(0, C, baseSpeed)).toBe(baseSpeed);
    expect(speedFor(149, C, baseSpeed)).toBe(baseSpeed);
    expect(spacingFor(0, C, baseSpeed)).toBeCloseTo(1.8 * baseSpeed, 6);
    expect(spacingFor(150, C, baseSpeed)).toBeCloseTo(C.minSpacing, 6);
    expect(speedFor(400, C, baseSpeed)).toBeCloseTo(1.7 * baseSpeed, 6);
    expect(speedFor(10000, C, baseSpeed)).toBeCloseTo(3.0 * baseSpeed, 6);
  });

  it('間隔は単調に縮み、速度は単調に上がる', () => {
    for (let n = 1; n <= 1200; n++) {
      expect(spacingFor(n, C, baseSpeed)).toBeLessThanOrEqual(spacingFor(n - 1, C, baseSpeed) + 1e-9);
      expect(speedFor(n, C, baseSpeed)).toBeGreaterThanOrEqual(speedFor(n - 1, C, baseSpeed) - 1e-9);
    }
  });
});
