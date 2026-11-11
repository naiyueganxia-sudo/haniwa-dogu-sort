import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG as C, DIFFICULTIES, DIFFICULTY_ORDER, RULE_VERSION, variantCountAt } from '../src/core/config';
import { Game, mixSeed } from '../src/core/game';
import { decodeLog, encodeLog, replay } from '../src/core/replay';
import { pointsFor } from '../src/core/scoring';
import { variantsOf } from '../src/data/artifacts';
import { playLikeApp } from './helpers';

describe('難易度の定義（詳細設計 17.1）', () => {
  it('最初の種類と上限、倍率は表どおり', () => {
    expect(DIFFICULTY_ORDER.map((d) => [DIFFICULTIES[d].startVariants, DIFFICULTIES[d].maxVariants, DIFFICULTIES[d].scoreMult])).toEqual([
      [2, 4, 0.5],
      [4, 10, 1.0],
      [6, 12, 1.5],
      [8, 16, 2.0],
    ]);
    expect(RULE_VERSION).toBe(2);
  });

  it('難しいほど、最初も上限も種類が多い（だんだん増える）', () => {
    for (let i = 1; i < DIFFICULTY_ORDER.length; i++) {
      const a = DIFFICULTIES[DIFFICULTY_ORDER[i - 1]!];
      const b = DIFFICULTIES[DIFFICULTY_ORDER[i]!];
      expect(b.startVariants).toBeGreaterThan(a.startVariants);
      expect(b.maxVariants).toBeGreaterThan(a.maxVariants);
      expect(b.scoreMult).toBeGreaterThan(a.scoreMult);
    }
  });
});

describe('種類の増え方（詳細設計 17.2、R10）', () => {
  it('15個ごとに1種ずつ増え、上限で止まる', () => {
    expect([0, 14, 15, 29, 30, 100].map((n) => variantCountAt(n, 'easy', C))).toEqual([2, 2, 3, 3, 4, 4]);
    expect([0, 15, 89, 90, 1000].map((n) => variantCountAt(n, 'normal', C))).toEqual([4, 5, 9, 10, 10]);
    expect([0, 89, 90, 1000].map((n) => variantCountAt(n, 'hard', C))).toEqual([6, 11, 12, 12]);
    expect([0, 119, 120, 1000].map((n) => variantCountAt(n, 'extreme', C))).toEqual([8, 15, 16, 16]);
  });

  it('実際のゲームでも、その時点で出てよい種類しか出ない。上限より後ろの種類は一度も出ない', () => {
    for (const diff of DIFFICULTY_ORDER) {
      const order = { haniwa: variantsOf('haniwa').map((v) => v.id), dogu: variantsOf('dogu').map((v) => v.id) };
      const g = new Game(42, diff);
      const seen = new Set<string>();
      let unlocks = 0;
      let t = 0;
      while (g.spawnedCount < 400) {
        t += 0.05;
        g.advanceTo(t);
        for (const e of g.drainEvents()) {
          if (e.type === 'unlock') unlocks++;
          if (e.type !== 'spawn') continue;
          const n = g.spawnedCount - 1;
          const idx = order[e.item.category].indexOf(e.item.variantId);
          expect(idx, `${diff} n=${n}`).toBeLessThan(variantCountAt(n, diff, C));
          seen.add(e.item.variantId);
        }
        // 見逃しで終わらないよう、先頭を正解で仕分け続ける
        const f = g.front;
        if (f && g.zoneOfItem(f) !== 'waiting') g.press(f.category === 'haniwa' ? 'L' : 'R', t);
      }
      const d = DIFFICULTIES[diff];
      expect(unlocks).toBe(d.maxVariants - d.startVariants);
      expect(seen.size, diff).toBe(d.maxVariants * 2);
    }
  });

  it('種類が増えたとき unlock の出来事が出る（最初の出土品では出ない）', () => {
    const g = new Game(1, 'easy');
    g.advanceTo(3);
    expect(g.drainEvents().some((e) => e.type === 'unlock')).toBe(false);
  });
});

describe('点数（D-31）', () => {
  it('100 × コンボ倍率 × 難易度倍率（四捨五入）', () => {
    expect(pointsFor(1, C, 0.5)).toBe(50);
    expect(pointsFor(10, C, 0.5)).toBe(60);
    expect(pointsFor(20, C, 0.5)).toBe(75);
    expect(pointsFor(70, C, 1.5)).toBe(375);
    expect(pointsFor(100, C, 2)).toBe(600);
    expect(pointsFor(10, C)).toBe(120);
  });

  it('同じ正解数なら、難しい難易度ほど点数が高い', () => {
    const scores = DIFFICULTY_ORDER.map((d) => {
      const g = new Game(3, d);
      let t = 0;
      while (g.correct < 25) {
        t += 0.02;
        g.advanceTo(t);
        const f = g.front;
        if (f && g.zoneOfItem(f) === 'normal') g.press(f.category === 'haniwa' ? 'L' : 'R', t);
      }
      return g.score;
    });
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(scores[1]).toBe(100 * 9 + 120 * 10 + 150 * 6);
    expect(scores[0]! * 2).toBe(scores[1]);
    expect(scores[3]).toBe(scores[1]! * 2);
  });
});

describe('種の混ぜ方（詳細設計 17.4、R13）', () => {
  it('同じ種でも難易度が違えば出土品の並びが違う', () => {
    const seqs = DIFFICULTY_ORDER.map((d) => {
      const g = new Game(777, d);
      g.advanceTo(60);
      return g.drainEvents().filter((e) => e.type === 'spawn').map((e) => (e.type === 'spawn' ? e.item.category[0] : '')).join('');
    });
    expect(new Set(seqs).size).toBe(4);
    expect(new Set(DIFFICULTY_ORDER.map((d) => mixSeed(777, d))).size).toBe(4);
  });

  it('かんたんの操作記録を激むずとして再計算すると、点数が合わない', () => {
    let mismatches = 0;
    for (let i = 0; i < 50; i++) {
      const g = playLikeAppDiff(1000 + i, i, 'easy');
      const r = replay(1000 + i, decodeLog(encodeLog(g.pressLog)!)!, 'extreme');
      if (r.score !== g.score * 4) mismatches++;
    }
    expect(mismatches).toBeGreaterThanOrEqual(49);
  });

  it('各難易度で、画面と同じ流れの記録を再計算すると完全に一致する（各300通り）', () => {
    for (const d of DIFFICULTY_ORDER) {
      for (let i = 0; i < 300; i++) {
        const seed = (i * 2654435761 + 17) >>> 0;
        const g = playLikeAppDiff(seed, i, d);
        const r = replay(seed, decodeLog(encodeLog(g.pressLog)!)!, d);
        expect(r.stats(), `${d} ${seed}`).toEqual(g.stats());
      }
    }
  });
});

function playLikeAppDiff(seed: number, rngSeed: number, diff: (typeof DIFFICULTY_ORDER)[number]) {
  return playLikeApp(seed, rngSeed, { errorRate: 0.03, stopAfterSec: 20 + (rngSeed % 5) * 10, difficulty: diff });
}
