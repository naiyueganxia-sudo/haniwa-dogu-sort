/**
 * 自動プレイの予定表づくり（詳細設計 18.5）。
 * ゲーム本体の計算（src/core）をそのまま動かし、「いつ・どちらを押すか」を決める。
 * 単独で動かすと、種を何個か試して見せ場の時刻を一覧にする：npm run plan
 */
import { Game } from '../src/core/game';
import { DEFAULT_CONFIG } from '../src/core/config';
import { quantize } from '../src/core/replay';
import { SIDE_OF, type Side } from '../src/core/types';

export const DIFFICULTY = 'extreme' as const; // D-40

export interface Press {
  /** ゲーム時刻（秒、1ms 単位） */
  t: number;
  side: Side;
  wrong: boolean;
}

export interface Plan {
  seed: number;
  presses: Press[];
  /** 10コンボの時刻 */
  tCombo10: number;
  /** 最初に種類が増えた時刻 */
  tUnlock: number;
  /** 最初のわざとのミスの時刻 */
  tFirstWrong: number;
  /** ゲームオーバーの時刻 */
  tOver: number;
  score: number;
  maxCombo: number;
  /** 見せる範囲に出た種類（はにわ／土偶） */
  variants: { haniwa: Set<string>; dogu: Set<string> };
  firstCategories: string[];
}

/** 種から決まる揺らぎ（毎回同じ動画になるように） */
function jitter(seed: number): () => number {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 予定表を作る。wrongAfter：この時刻より後に判定の範囲に入った出土品は、わざと反対側を押す
 */
export function makePlan(seed: number, wrongAfter: number): Plan {
  const cfg = DEFAULT_CONFIG;
  const g = new Game(seed, DIFFICULTY, cfg);
  const rnd = jitter(seed);
  const presses: Press[] = [];
  const variants = { haniwa: new Set<string>(), dogu: new Set<string>() };
  const firstCategories: string[] = [];
  let tCombo10 = NaN;
  let tUnlock = NaN;
  let tFirstWrong = NaN;
  let tOver = NaN;
  let lastPress = -1;
  let t = 0;

  const take = () => {
    for (const e of g.drainEvents()) {
      if (e.type === 'spawn') {
        if (firstCategories.length < 4) firstCategories.push(e.item.category);
        variants[e.item.category].add(e.item.variantId);
      }
      if (e.type === 'milestone' && e.combo === 10 && Number.isNaN(tCombo10)) tCombo10 = e.t;
      if (e.type === 'unlock' && Number.isNaN(tUnlock)) tUnlock = e.t;
      if (e.type === 'gameover') tOver = e.t;
    }
  };

  while (g.status === 'playing' && t < 120) {
    // 先頭の出土品が判定の範囲（早め）に入る時刻を1msずつ探す
    const front = g.front;
    if (!front || g.zoneOfItem(front) === 'waiting') {
      t = quantize(t + 0.001);
      g.advanceTo(t);
      take();
      continue;
    }
    // 入ってから 0.08〜0.38 秒後に押す（人らしい揺らぎ）。前の押下から 0.12 秒は空ける
    const tp = quantize(Math.max(t + 0.08 + rnd() * 0.3, lastPress + 0.12));
    const wrong = t > wrongAfter;
    const right = SIDE_OF[front.category];
    const side: Side = wrong ? (right === 'L' ? 'R' : 'L') : right;
    const id = front.id;
    g.advanceTo(tp);
    take();
    if (g.status !== 'playing') break;
    if (g.front?.id !== id) {
      // 押す前に見逃しになった（起きないはずだが念のため）
      throw new Error(`seed ${seed}: 出土品 ${id} を押す前に見逃した`);
    }
    g.press(side, tp);
    take();
    presses.push({ t: tp, side, wrong });
    if (wrong && Number.isNaN(tFirstWrong)) tFirstWrong = tp;
    lastPress = tp;
    t = tp;
  }
  const s = g.stats();
  return { seed, presses, tCombo10, tUnlock, tFirstWrong, tOver, score: s.score, maxCombo: s.maxCombo, variants, firstCategories };
}

// 単独で動かしたとき：種を試して一覧にする
if (process.argv[1]?.endsWith('plan.ts')) {
  const from = Number(process.argv[2] ?? 1);
  const count = Number(process.argv[3] ?? 20);
  for (let seed = from; seed < from + count; seed++) {
    const p = makePlan(seed, 1e9 /* ミスなしで流れを見る */);
    const p2 = makePlan(seed, Math.max(p.tCombo10, p.tUnlock) + 2);
    console.log(
      [
        `seed ${seed}`,
        `combo10 ${p.tCombo10.toFixed(2)}`,
        `unlock ${p.tUnlock.toFixed(2)}`,
        `first ${p.firstCategories.join(',')}`,
        `→ wrong ${p2.tFirstWrong.toFixed(2)} over ${p2.tOver.toFixed(2)} score ${p2.score} maxCombo ${p2.maxCombo}`,
        `kinds ${p2.variants.haniwa.size}+${p2.variants.dogu.size}`,
      ].join('  '),
    );
  }
}
