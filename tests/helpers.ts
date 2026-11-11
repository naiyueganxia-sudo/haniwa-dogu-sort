import type { Difficulty } from '../src/core/config';
import { Game } from '../src/core/game';
import { quantize } from '../src/core/replay';
import { Rng } from '../src/core/rng';
import { SIDE_OF, type Side } from '../src/core/types';

const opposite = (s: Side): Side => (s === 'L' ? 'R' : 'L');

export interface PlayOptions {
  /** 1回の仕分けで間違える確率 */
  errorRate?: number;
  /** この秒数を過ぎたら押すのをやめる（そのあと見逃しで終了する） */
  stopAfterSec?: number;
  difficulty?: Difficulty;
}

/**
 * 実際の画面と同じ流れでゲームを遊ぶ（詳細設計 16.13）：
 * ばらばらの刻みのフレーム、ミリ秒に丸めた時刻、フレームより前の時刻の入力、ときどき無視される入力。
 */
export function playLikeApp(seed: number, rngSeed: number, opt: PlayOptions = {}): Game {
  const g = new Game(seed, opt.difficulty ?? 'normal');
  const r = new Rng(rngSeed);
  const err = opt.errorRate ?? 0.01;
  const stop = opt.stopAfterSec ?? Infinity;
  let real = 0;
  while (g.status === 'playing' && real < 4000) {
    real += 0.004 + r.next() * 0.03; // 刻み 4〜34ms
    const tFrame = quantize(real);
    g.advanceTo(tFrame);
    const f = g.front;
    if (real < stop && f) {
      const zone = g.zoneOfItem(f);
      if (zone === 'normal' || (zone === 'early' && r.chance(0.2)) || (zone === 'waiting' && r.chance(0.01))) {
        const right = SIDE_OF[f.category];
        // 入力イベントの時刻は直前のフレームより少し前のこともある
        const tEvent = quantize(real - r.next() * 0.02);
        g.press(r.chance(err) ? opposite(right) : right, tEvent);
      }
    }
    g.drainEvents();
  }
  return g;
}
