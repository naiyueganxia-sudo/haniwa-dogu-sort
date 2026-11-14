import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config';
import { clampSpeed, customCounts, defaultCustom, firstN, normalizeCustom, speedLabel, speedText, type CustomSettings } from '../src/core/custom';
import { Game, mixSeed } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { Spawner } from '../src/core/spawner';
import type { GameEvent } from '../src/core/types';
import { variantsOf } from '../src/data/artifacts';
import { playLikeApp } from './helpers';

const custom = (o: Partial<CustomSettings>): CustomSettings => ({ ...defaultCustom(), ...o });

/** 押さずに出現だけを見る（見逃し3回で終わらないよう、出現の時刻だけ集める） */
function spawnTimes(g: Game, count: number): number[] {
  const ts: number[] = [];
  let t = 0;
  while (ts.length < count && g.status === 'playing') {
    t += 0.05;
    g.advanceTo(t);
    for (const e of g.drainEvents()) if (e.type === 'spawn') ts.push(e.t);
  }
  return ts;
}

describe('カスタムの設定（詳細設計 19.2）', () => {
  it('初期設定は はにわ・土偶とも先頭から4種、×1.0、速度アップ ON（R19）', () => {
    const d = defaultCustom();
    expect(d.variants).toEqual([...firstN('haniwa', 4), ...firstN('dogu', 4)]);
    expect(d.speed).toBe(1);
    expect(d.speedUp).toBe(true);
  });

  it('知らない id・重複を捨て、一覧の順にそろえる。空なら初期設定', () => {
    const h = firstN('haniwa', 3);
    const d = firstN('dogu', 2);
    const n = normalizeCustom({ variants: [d[1], 'unknown', h[2], h[0], h[0], d[0]], speed: 1.24, speedUp: false });
    expect(n.variants).toEqual([h[0], h[2], d[0], d[1]]);
    expect(n.speed).toBe(1.2);
    expect(n.speedUp).toBe(false);
    expect(normalizeCustom({ variants: [] })).toEqual(defaultCustom());
    expect(normalizeCustom(null)).toEqual(defaultCustom());
    expect(normalizeCustom('x')).toEqual(defaultCustom());
  });

  it('速さは 0.5〜3.0 に収め、0.1 単位にする', () => {
    expect(clampSpeed(0.1)).toBe(0.5);
    expect(clampSpeed(9)).toBe(3);
    expect(clampSpeed(1.26)).toBe(1.3);
    expect(clampSpeed(NaN)).toBe(1);
  });

  it('速さの目安の言葉（D-49）', () => {
    expect([0.5, 0.6, 0.7, 0.9, 1.0, 1.1, 1.4, 1.5, 1.9, 2.0, 3.0].map(speedLabel)).toEqual([
      'とてもゆっくり', 'とてもゆっくり', 'ゆっくり', 'ゆっくり', 'ふつう', 'はやい', 'はやい', 'とてもはやい', 'とてもはやい', '激はや', '激はや',
    ]);
    expect(speedText(1.3)).toBe('×1.3（はやい）');
  });

  it('選んだ数を数える', () => {
    expect(customCounts(custom({ variants: [...firstN('haniwa', 4), ...firstN('dogu', 12)] }))).toEqual({ haniwa: 4, dogu: 12 });
  });
});

describe('カスタムで遊ぶ（詳細設計 19.3）', () => {
  it('選んだ出土品しか出ず、途中で増えない（D-46・D-47）', () => {
    const pick = [variantsOf('haniwa')[5]!.id, variantsOf('haniwa')[15]!.id, variantsOf('dogu')[9]!.id];
    const seen = new Set<string>();
    const events: GameEvent[] = [];
    const g = playLikeApp(3, 4, { difficulty: 'custom', custom: custom({ variants: pick }), errorRate: 0.003, onEvents: (ev) => events.push(...ev) });
    for (const e of events) if (e.type === 'spawn') seen.add(e.item.variantId);
    expect(g.spawnedCount).toBeGreaterThan(200);
    expect([...seen].sort()).toEqual([...pick].sort());
    expect(events.some((e) => e.type === 'unlock')).toBe(false);
  });

  it('はにわだけを選ぶと、はにわだけが出る（0%・100%。D-48）', () => {
    const sp = new Spawner(DEFAULT_CONFIG, new Rng(9), 'custom', custom({ variants: firstN('haniwa', 2) }));
    for (let i = 0; i < 2000; i++) expect(sp.nextCategory()).toBe('haniwa');
    const sp2 = new Spawner(DEFAULT_CONFIG, new Rng(9), 'custom', custom({ variants: firstN('dogu', 1) }));
    for (let i = 0; i < 2000; i++) expect(sp2.nextCategory()).toBe('dogu');
  });

  it('割合は選んだ数に近い（はにわ4・土偶12 → 約25%。D-48）', () => {
    const sp = new Spawner(DEFAULT_CONFIG, new Rng(11), 'custom', custom({ variants: [...firstN('haniwa', 4), ...firstN('dogu', 12)] }));
    let h = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (sp.nextCategory() === 'haniwa') h++;
    expect(h / N).toBeGreaterThan(0.22);
    expect(h / N).toBeLessThan(0.28);
  });

  it('同じ数を選べば、今までの出方と同じ確率になる（r = 50%）', () => {
    const a = new Spawner(DEFAULT_CONFIG, new Rng(5), 'normal');
    const b = new Spawner(DEFAULT_CONFIG, new Rng(5), 'custom', custom({ variants: [...firstN('haniwa', 3), ...firstN('dogu', 3)] }));
    for (let i = 0; i < 500; i++) {
      expect(b.probHaniwa()).toBeCloseTo(a.probHaniwa(), 12);
      a.nextCategory();
      b.nextCategory();
    }
  });

  it('速度 ×2 では、流れる速さが2倍で、出てくる間隔が半分（D-49）', () => {
    const g1 = new Game(7, 'custom', DEFAULT_CONFIG, custom({ speed: 1 }));
    const g2 = new Game(7, 'custom', DEFAULT_CONFIG, custom({ speed: 2 }));
    expect(g2.speed).toBeCloseTo(g1.speed * 2, 9);
    const t1 = spawnTimes(g1, 3);
    const t2 = spawnTimes(g2, 3);
    expect(t2[2]! - t2[1]!).toBeCloseTo((t1[2]! - t1[1]!) / 2, 2);
  });

  it('×1.0 で速度アップ ON なら、速さと間隔は「ふつう」と同じ', () => {
    const a = new Game(7, 'normal');
    const b = new Game(7, 'custom', DEFAULT_CONFIG, custom({}));
    expect(b.speed).toBe(a.speed);
    const ta = spawnTimes(a, 3);
    const tb = spawnTimes(b, 3);
    expect(tb).toEqual(ta);
  });

  it('速度アップ OFF では、長く遊んでも速さと間隔が変わらない（C-69）', () => {
    const times: number[] = [];
    const g = playLikeApp(21, 22, {
      difficulty: 'custom',
      custom: custom({ speedUp: false }),
      errorRate: 0.002,
      onEvents: (ev) => {
        for (const e of ev) if (e.type === 'spawn') times.push(e.t);
      },
    });
    const first = new Game(21, 'custom', DEFAULT_CONFIG, custom({ speedUp: false })).speed;
    expect(g.spawnedCount).toBeGreaterThan(300);
    expect(g.speed).toBe(first);
    const gaps = times.slice(1).map((t, i) => t - times[i]!);
    // 押すと位置の基準が変わるので、ミリ秒単位でそろっていることを確かめる
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 2);
    // ON なら同じ数だけ遊ぶと間隔は詰まる
    const on: number[] = [];
    playLikeApp(21, 22, { difficulty: 'custom', custom: custom({}), errorRate: 0.002, stopAfterSec: 400, onEvents: (ev) => { for (const e of ev) if (e.type === 'spawn') on.push(e.t); } });
    expect(on[on.length - 1]! - on[on.length - 2]!).toBeLessThan(gaps[0]! - 0.3);
  });

  it('点数の倍率は ×1.0（D-52）', () => {
    const g = new Game(1, 'custom', DEFAULT_CONFIG, custom({}));
    const events: GameEvent[] = [];
    let t = 0;
    while (!events.some((e) => e.type === 'correct') && t < 30) {
      t += 0.01;
      g.advanceTo(t);
      const f = g.front;
      if (f && g.zoneOfItem(f) === 'normal') g.press(f.category === 'haniwa' ? 'L' : 'R', t);
      events.push(...g.drainEvents());
    }
    const c = events.find((e) => e.type === 'correct');
    expect(c && c.type === 'correct' && c.points).toBe(100);
  });

  it('カスタムの種は、4つの難易度と別の並びになる', () => {
    expect(mixSeed(123, 'custom')).not.toBe(mixSeed(123, 'normal'));
    expect(mixSeed(123, 'custom')).not.toBe(mixSeed(123, 'extreme'));
  });

  it('設定なしのカスタム・1つも選んでいない設定は作れない', () => {
    expect(() => new Game(1, 'custom')).toThrow();
    expect(() => new Spawner(DEFAULT_CONFIG, new Rng(1), 'custom', { variants: [], speed: 1, speedUp: true })).toThrow();
  });
});
