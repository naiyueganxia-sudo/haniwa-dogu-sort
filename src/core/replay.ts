import { DEFAULT_CONFIG, type Difficulty, type GameConfig } from './config';
import { Game } from './game';
import type { Side } from './types';

/**
 * 操作記録と再計算（詳細設計 16.2・16.3）。ブラウザとランキングのサーバーで共用する。
 */

/** 時刻（秒）を1ミリ秒単位にそろえる（R1）。ゲームに渡す時刻はすべてこれを通す */
export function quantize(t: number): number {
  return Math.round(t * 1000) / 1000;
}

export interface PressRecord {
  /** ゲーム時刻（ミリ秒、整数） */
  ms: number;
  side: Side;
}

/** 操作記録の上限（R4：約60分ぶん） */
export const MAX_LOG_LENGTH = 200_000;

/**
 * ゲームの入力記録を文字列にする。前の操作との差（ミリ秒）×2＋（右なら1）を36進数にして `,` でつなぐ。
 * 時刻が1ミリ秒単位でない・時刻が戻っているなど、正確に再現できない記録なら null。
 */
export function encodeLog(presses: readonly { t: number; side: Side }[]): string | null {
  const out: string[] = [];
  let prev = 0;
  for (const p of presses) {
    const ms = Math.round(p.t * 1000);
    if (ms / 1000 !== p.t || ms < prev) return null;
    out.push(((ms - prev) * 2 + (p.side === 'R' ? 1 : 0)).toString(36));
    prev = ms;
  }
  const s = out.join(',');
  return s.length > MAX_LOG_LENGTH ? null : s;
}

/** 文字列を操作記録に戻す。形式が正しくなければ null */
export function decodeLog(s: string): PressRecord[] | null {
  if (typeof s !== 'string' || s.length > MAX_LOG_LENGTH) return null;
  if (s === '') return [];
  if (!/^[0-9a-z]{1,10}(,[0-9a-z]{1,10})*$/.test(s)) return null;
  const out: PressRecord[] = [];
  let ms = 0;
  for (const tok of s.split(',')) {
    const v = parseInt(tok, 36);
    if (!Number.isSafeInteger(v)) return null;
    ms += Math.floor(v / 2);
    if (!Number.isSafeInteger(ms)) return null;
    out.push({ ms, side: v % 2 === 1 ? 'R' : 'L' });
  }
  return out;
}

/**
 * 種と操作記録からゲームを最初から再現し、終了まで進めたゲームを返す。
 * 入力のない区間は出土品が流れ続けるので、最後の操作のあと必ずミス3回で終了する。
 */
export function replay(
  seed: number,
  presses: readonly PressRecord[],
  difficulty: Difficulty = 'normal',
  cfg: GameConfig = DEFAULT_CONFIG,
): Game {
  const g = new Game(seed, difficulty, cfg);
  for (const p of presses) {
    if (g.status === 'over') break;
    g.press(p.side, p.ms / 1000);
  }
  g.advanceTo(Infinity);
  g.drainEvents();
  return g;
}
