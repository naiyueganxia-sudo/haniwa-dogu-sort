import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG as C } from '../src/core/config';
import { Rng } from '../src/core/rng';
import { Spawner, type PatternKind } from '../src/core/spawner';
import type { Category } from '../src/core/types';
import { variantsOf } from '../src/data/artifacts';

describe('出現の抽選（D-07, C-28〜C-30）', () => {
  it('長い目で見ると各分類が約50%', () => {
    const s = new Spawner(C, new Rng(1));
    let h = 0;
    const N = 200_000;
    for (let i = 0; i < N; i++) if (s.nextCategory() === 'haniwa') h++;
    expect(h / N).toBeGreaterThan(0.49);
    expect(h / N).toBeLessThan(0.51);
  });

  it('どの1個も「はにわ」になる確率は0.2〜0.8（確定的に予測できない）', () => {
    const s = new Spawner(C, new Rng(2));
    for (let i = 0; i < 50_000; i++) {
      s.nextCategory();
      const p = s.probHaniwa();
      expect(p).toBeGreaterThanOrEqual(0.2);
      expect(p).toBeLessThanOrEqual(0.8);
    }
  });

  it('同じ分類が何回続いても、次に反対側が出ることがある', () => {
    const s = new Spawner(C, new Rng(3));
    let run = 0;
    let last: Category | null = null;
    const afterLongRun = { same: 0, other: 0 };
    for (let i = 0; i < 300_000; i++) {
      const c = s.nextCategory();
      if (run >= 6) afterLongRun[c === last ? 'same' : 'other']++;
      run = c === last ? run + 1 : 1;
      last = c;
    }
    expect(afterLongRun.other).toBeGreaterThan(0);
    expect(afterLongRun.same).toBeGreaterThan(0);
  });

  it('パターンは8個ごとに重みどおり抽選される', () => {
    const s = new Spawner(C, new Rng(4));
    const count: Record<PatternKind, number> = { random: 0, streak: 0, alternate: 0, bias: 0 };
    const blocks = 40_000;
    for (let b = 0; b < blocks; b++) {
      s.nextCategory();
      count[s.currentPattern]++;
      for (let i = 1; i < C.patternBlock; i++) s.nextCategory();
    }
    expect(count.random / blocks).toBeCloseTo(0.5, 1);
    expect(count.streak / blocks).toBeCloseTo(0.2, 1);
    expect(count.alternate / blocks).toBeCloseTo(0.15, 1);
    expect(count.bias / blocks).toBeCloseTo(0.15, 1);
  });

  it('種類は直前と同じにならず、激むずでは（上限に達したあと）全種類が出る', () => {
    const s = new Spawner(C, new Rng(5), 'extreme');
    for (const cat of ['haniwa', 'dogu'] as const) {
      const seen = new Set<string>();
      let prev = '';
      for (let i = 0; i < 2000; i++) {
        const v = s.nextVariant(cat, 1000);
        expect(v).not.toBe(prev);
        prev = v;
        seen.add(v);
      }
      expect(seen.size).toBe(variantsOf(cat).length);
    }
  });

  it('見た目は設定の範囲内（分類に関係なく同じ分布）', () => {
    const s = new Spawner(C, new Rng(6));
    for (let i = 0; i < 5000; i++) {
      const l = s.nextLook();
      expect(l.palette).toBeGreaterThanOrEqual(0);
      expect(l.palette).toBeLessThan(C.paletteSize);
      expect(l.scale).toBeGreaterThanOrEqual(C.lookScale[0]);
      expect(l.scale).toBeLessThanOrEqual(C.lookScale[1]);
      expect(Math.abs(l.rotDeg)).toBeLessThanOrEqual(C.lookRotDeg);
    }
  });
});
