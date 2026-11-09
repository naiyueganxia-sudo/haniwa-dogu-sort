import { describe, expect, it } from 'vitest';
import { Game } from '../src/core/game';
import { decodeLog, encodeLog, MAX_LOG_LENGTH, quantize, replay } from '../src/core/replay';
import { Rng } from '../src/core/rng';
import { SIDE_OF } from '../src/core/types';
import { playLikeApp } from './helpers';

describe('刻み非依存（詳細設計 16.2）', () => {
  it('同じ入力なら、進める刻みが違っても位置・時刻まで1ビットも違わない', () => {
    const ref = playLikeApp(9, 1, { errorRate: 0.003 });
    const presses = ref.pressLog;
    expect(presses.length).toBeGreaterThan(100);

    const steps = [1 / 30, 1 / 60, 1 / 144];
    const jitter = new Rng(3);
    for (const stepOf of [...steps.map((s) => () => s), () => 0.0005 + jitter.next() * 0.1]) {
      const g = new Game(9);
      let now = 0;
      const snapshots: string[] = [];
      for (const p of presses) {
        while (now + 1e-9 < p.t) {
          now = Math.min(p.t, now + stepOf());
          g.advanceTo(now);
        }
        g.press(p.side, p.t);
        snapshots.push(`${g.time}|${g.D}|${g.score}|${g.items.length}`);
      }
      const ref2 = new Game(9);
      const refSnaps: string[] = [];
      for (const p of presses) {
        ref2.press(p.side, p.t);
        refSnaps.push(`${ref2.time}|${ref2.D}|${ref2.score}|${ref2.items.length}`);
      }
      expect(snapshots).toEqual(refSnaps);
    }
  });
});

describe('操作記録（詳細設計 16.3）', () => {
  it('圧縮→復元で元に戻る', () => {
    const log = [
      { t: 0.5, side: 'L' as const },
      { t: 0.5, side: 'R' as const },
      { t: 12.345, side: 'R' as const },
      { t: 3600.001, side: 'L' as const },
    ];
    const s = encodeLog(log)!;
    expect(s).toMatch(/^[0-9a-z,]+$/);
    expect(decodeLog(s)).toEqual([
      { ms: 500, side: 'L' },
      { ms: 500, side: 'R' },
      { ms: 12345, side: 'R' },
      { ms: 3600001, side: 'L' },
    ]);
    expect(encodeLog([])).toBe('');
    expect(decodeLog('')).toEqual([]);
  });

  it('ミリ秒単位でない時刻・戻る時刻は記録できない', () => {
    expect(encodeLog([{ t: 0.0005, side: 'L' }])).toBeNull();
    expect(encodeLog([{ t: 2, side: 'L' }, { t: 1, side: 'R' }])).toBeNull();
  });

  it('壊れた記録・長すぎる記録は拒否', () => {
    for (const bad of ['A1', '1,,2', ',1', '1,', '-1', '1.5', 'zzzzzzzzzzz', '1 2', '０']) expect(decodeLog(bad), bad).toBeNull();
    expect(decodeLog('1,'.repeat(MAX_LOG_LENGTH / 2) + '1')).toBeNull();
    expect(decodeLog(123 as unknown as string)).toBeNull();
  });
});

describe('再計算（詳細設計 16.5 の6）', () => {
  it('画面と同じ流れで遊んだ記録を再計算すると、結果が完全に一致する（2,000通り）', () => {
    for (let i = 0; i < 2000; i++) {
      const seed = (i * 2654435761) >>> 0;
      const g = playLikeApp(seed, i, { errorRate: 0.02 + (i % 5) * 0.01, stopAfterSec: 20 + (i % 7) * 15 });
      expect(g.status).toBe('over');
      const log = encodeLog(g.pressLog);
      expect(log).not.toBeNull();
      const r = replay(seed, decodeLog(log!)!);
      expect(r.status).toBe('over');
      expect(r.stats(), `seed ${seed}`).toEqual(g.stats());
      expect(r.overTime).toBe(g.overTime);
    }
  });

  it('入力のない記録でも必ず終了する（3個見逃し）', () => {
    const r = replay(1, []);
    expect(r.status).toBe('over');
    expect(r.passed).toBe(3);
    expect(r.score).toBe(0);
  });

  it('記録を書き換えると点数が変わる（左右を入れ替え）', () => {
    const g = playLikeApp(77, 1, { errorRate: 0, stopAfterSec: 30 });
    const flipped = decodeLog(encodeLog(g.pressLog)!)!.map((p) => ({ ...p, side: p.side === 'L' ? ('R' as const) : ('L' as const) }));
    expect(replay(77, flipped).score).toBeLessThan(g.score);
  });

  it('長いプレイでも再計算は速い（サーバーの処理時間の上限に収まる）', () => {
    // ほぼ間違えないボットで約10分
    const g = new Game(5);
    let t = 0;
    while (g.status === 'playing' && t < 600) {
      t = quantize(t + 0.016);
      g.advanceTo(t);
      const f = g.front;
      if (f && g.zoneOfItem(f) === 'normal') g.press(SIDE_OF[f.category], t);
    }
    const presses = decodeLog(encodeLog(g.pressLog)!)!;
    expect(presses.length).toBeGreaterThan(1500);
    const t0 = performance.now();
    replay(5, presses);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(50);
  });
});
