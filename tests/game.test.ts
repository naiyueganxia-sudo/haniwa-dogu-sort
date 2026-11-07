import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG as C, derive } from '../src/core/config';
import { Game } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { SIDE_OF, type GameEvent, type Side } from '../src/core/types';

const d = derive(C);
/** 最初の出土品の中心が y に来る時刻 */
const tAt = (y: number) => (y - C.spawnY) / d.baseSpeed;
const opposite = (s: Side): Side => (s === 'L' ? 'R' : 'L');

/**
 * 正解ボット：一定間隔で状態を見て、先頭が通常判定エリアにあれば押す。
 * isRight(i) が false の回は反対側を押す。
 */
function runBot(g: Game, step: number, until: number, isRight: (i: number) => boolean, maxCorrect = Infinity) {
  const events: GameEvent[] = [];
  let t = 0;
  let i = 0;
  while (g.status === 'playing' && t < until && g.correct < maxCorrect) {
    t += step;
    g.advanceTo(t);
    const f = g.front;
    if (f && g.zoneOfItem(f) === 'normal') {
      const s = SIDE_OF[f.category];
      g.press(isRight(i++) ? s : opposite(s), t);
    }
    events.push(...g.drainEvents());
  }
  return events;
}

describe('ゲーム本体：判定（C-17〜C-24）', () => {
  it('待機エリアの入力は無視され、罰もない', () => {
    const g = new Game(1);
    g.advanceTo(tAt(500));
    const before = [...g.items];
    expect(g.press('L', tAt(500))).toBe('ignored-waiting');
    expect(g.press('R', tAt(500))).toBe('ignored-waiting');
    expect(g.misses).toBe(0);
    expect(g.items).toEqual(before);
  });

  it('出土品がないときの入力は無視', () => {
    const g = new Game(1);
    expect(g.press('L', 0)).toBe('ignored-empty');
  });

  it('先行入力エリアで即判定（正解）', () => {
    const g = new Game(1);
    g.advanceTo(tAt(600));
    const first = g.front!;
    const side = SIDE_OF[first.category];
    expect(g.zoneOfItem(g.front!)).toBe('early');
    expect(g.press(side, tAt(600))).toBe('correct');
    expect(g.score).toBe(100);
    expect(g.combo).toBe(1);
    expect(g.items).not.toContain(first);
  });

  it('通常判定エリアで不正解：ミス+1、コンボ0、出土品はコンベアから外れる', () => {
    const g = new Game(1);
    g.advanceTo(tAt(800));
    const first = g.front!;
    const side = opposite(SIDE_OF[first.category]);
    expect(g.press(side, tAt(800))).toBe('wrong');
    expect(g.misses).toBe(1);
    expect(g.wrong).toBe(1);
    expect(g.combo).toBe(0);
    expect(g.items).not.toContain(first);
    expect(g.front).not.toBe(first);
    const ev = g.drainEvents().find((e) => e.type === 'wrong');
    expect(ev && ev.type === 'wrong' && ev.side).toBe(side);
  });

  it('判定ラインに達した瞬間に見逃しミス', () => {
    const g = new Game(1);
    g.advanceTo(tAt(1000) - 1e-6);
    expect(g.passed).toBe(0);
    g.advanceTo(tAt(1000) + 1e-6);
    expect(g.passed).toBe(1);
    expect(g.misses).toBe(1);
    const ev = g.drainEvents().find((e) => e.type === 'passed');
    expect(ev?.t).toBeCloseTo(tAt(1000), 9);
  });

  it('ミス3回でゲームオーバー。以後は入力もコンベアも止まる', () => {
    const g = new Game(1);
    g.advanceTo(1000);
    expect(g.status).toBe('over');
    expect(g.misses).toBe(3);
    const frozen = { t: g.time, D: g.D, n: g.items.length };
    g.advanceTo(2000);
    expect(g.press('L', 2000)).toBe('ignored-over');
    expect({ t: g.time, D: g.D, n: g.items.length }).toEqual(frozen);
    expect(g.stats().playTimeSec).toBe(g.overTime);
    expect(g.drainEvents().filter((e) => e.type === 'gameover').length).toBe(1);
  });

  it('仕分けてもコンベアは止まらず、後続は瞬間移動しない（C-14）', () => {
    const g = new Game(7);
    let t = 0;
    while (g.items.length < 2) g.advanceTo((t += 0.01));
    while (g.zoneOfItem(g.front!) === 'waiting') g.advanceTo((t += 0.01));
    const second = g.items[1]!;
    const yBefore = g.yOf(second);
    const speedBefore = g.speed;
    g.press(SIDE_OF[g.front!.category], t);
    expect(g.yOf(second)).toBeCloseTo(yBefore, 9);
    expect(g.speed).toBe(speedBefore);
    expect(g.front).toBe(second);
  });

  it('コンボ倍率は加算後のコンボ数で決まる（D-04）：10個目の正解が+120', () => {
    const g = new Game(3);
    const ev = runBot(g, 0.01, 1e9, () => true, 40);
    const pts = ev.flatMap((e) => (e.type === 'correct' ? [e.points] : []));
    expect(pts[8]).toBe(100);
    expect(pts[9]).toBe(120);
    expect(pts[19]).toBe(150);
    const ms = ev.flatMap((e) => (e.type === 'milestone' ? [e.combo] : []));
    expect(ms).toEqual([10, 20, 40]);
  });

  it('リザルトの集計（D-08）', () => {
    const g = new Game(5);
    runBot(g, 0.01, 1e9, (i) => i % 10 !== 9);
    const s = g.stats();
    expect(g.status).toBe('over');
    expect(s.misses).toBe(3);
    expect(s.misses).toBe(s.wrong + s.passed);
    expect(s.sorted).toBe(s.correct + s.wrong);
    expect(s.accuracy).toBeCloseTo(s.correct / (s.correct + s.wrong + s.passed), 12);
  });
});

describe('ゲーム本体：コンベアと難易度', () => {
  it('出土品どうしは常に最小間隔以上離れている（C-15, C-34）', () => {
    const g = new Game(11);
    let t = 0;
    let minGap = Infinity;
    while (g.status === 'playing' && t < 900) {
      t += 0.02;
      g.advanceTo(t);
      for (let i = 0; i + 1 < g.items.length; i++) {
        minGap = Math.min(minGap, g.yOf(g.items[i]!) - g.yOf(g.items[i + 1]!));
      }
      const f = g.front;
      if (f && g.zoneOfItem(f) === 'normal') g.press(SIDE_OF[f.category], t);
    }
    expect(g.spawnedCount).toBeGreaterThan(500);
    expect(minGap).toBeGreaterThanOrEqual(C.minSpacing - 1e-6);
  });

  it('最初の出土品は約2.3秒後に押せるようになる', () => {
    expect(tAt(d.earlyStart)).toBeCloseTo(2.3, 1);
  });
});

describe('フレームレート非依存（C-40）', () => {
  it('同じ種・同じ入力列なら、進める刻みが違っても結果が完全に一致する', () => {
    // 基準の実行で入力列を作る（たまに間違える）
    const ref = new Game(2024);
    const script: { t: number; side: Side }[] = [];
    const errRng = new Rng(5);
    const refEvents: GameEvent[] = [];
    let t = 0;
    while (ref.status === 'playing' && t < 600) {
      t += 0.037;
      ref.advanceTo(t);
      const f = ref.front;
      if (f && ref.zoneOfItem(f) === 'normal') {
        const s = SIDE_OF[f.category];
        const side = errRng.chance(0.995) ? s : opposite(s);
        script.push({ t, side });
        ref.press(side, t);
      }
      refEvents.push(...ref.drainEvents());
    }
    // 終了していなければ最後の時刻まで進める（比較のため）
    const refEnd = t;

    const replay = (stepOf: () => number) => {
      const g = new Game(2024);
      const ev: GameEvent[] = [];
      let now = 0;
      let si = 0;
      while (g.status === 'playing' && now < refEnd) {
        now = Math.min(refEnd, now + stepOf());
        while (si < script.length && script[si]!.t <= now) {
          g.press(script[si]!.side, script[si]!.t);
          si++;
        }
        g.advanceTo(now);
        ev.push(...g.drainEvents());
      }
      return { stats: g.stats(), ev };
    };

    const sig = (ev: GameEvent[]) => ev.map((e) => `${e.type}@${e.t.toFixed(6)}`).join(',');
    const jitter = new Rng(77);
    const runs = [
      replay(() => 1 / 30),
      replay(() => 1 / 60),
      replay(() => 1 / 144),
      replay(() => 0.001 + jitter.next() * 0.09),
    ];
    for (const r of runs) {
      expect(r.stats).toEqual(ref.stats());
      expect(sig(r.ev)).toBe(sig(refEvents));
    }
    expect(ref.stats().correct).toBeGreaterThan(100);
  });
});
