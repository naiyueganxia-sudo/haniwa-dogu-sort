import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../src/core/config';
import { decodeLog, encodeLog, replay } from '../src/core/replay';
import { playLikeApp } from './helpers';

/**
 * 今の4つの難易度の結果が変わらないことの確認（詳細設計 19.8 の1）。
 * 値は難易度カスタムを入れる前のコード（2026-11-14、コミット 15dc8ea）で計算したもの。
 * ここが変わったら、ランキングの再計算の結果が変わる（RULE_VERSION を上げてサーバーも更新する必要がある）。
 */
type Row = [Difficulty, number, number, number, number, number, number, string, string];
const GOLDEN: Row[] = [
  ['easy', 1, 221100, 1585, 620, 604.228, 1591, '74f473b6', '6c2b542a'],
  ['easy', 777, 259500, 1841, 1509, 663.969, 1847, '109ce0a6', 'be3ae794'],
  ['easy', 20261114, 229950, 1644, 779, 617.902, 1650, '598023d9', 'a2f5081e'],
  ['normal', 1, 442200, 1585, 620, 604.228, 1591, '3b646b34', '901a31d8'],
  ['normal', 777, 519000, 1841, 1509, 663.969, 1847, 'ffd1298c', '67d53c52'],
  ['normal', 20261114, 459900, 1644, 779, 617.902, 1650, '42250ef4', '360aa6bc'],
  ['hard', 1, 663300, 1585, 620, 604.228, 1591, '89ee89c8', '912b95a0'],
  ['hard', 777, 778500, 1841, 1509, 663.969, 1847, 'df188f1e', 'a6cde816'],
  ['hard', 20261114, 689850, 1644, 779, 617.902, 1650, 'c097bbe3', '3901047e'],
  ['extreme', 1, 884400, 1585, 620, 604.228, 1591, '1cd8d20b', '921bd64a'],
  ['extreme', 777, 1038000, 1841, 1509, 663.969, 1847, 'bd40bf0d', 'c34c3f3c'],
  ['extreme', 20261114, 919800, 1644, 779, 617.902, 1650, '8eb6ac08', '6e185096'],
];

function fnv(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

describe('今の4つの難易度は変わらない（固定値）', () => {
  it.each(GOLDEN)('%s 種%i', (d, seed, score, correct, maxCombo, playTime, spawned, seqHash, logHash) => {
    let seq = '';
    const g = playLikeApp(seed, seed + 5, {
      difficulty: d,
      errorRate: 0.004,
      onEvents: (ev) => {
        for (const e of ev) if (e.type === 'spawn') seq += e.item.category[0] + e.item.variantId + ',';
      },
    });
    const s = g.stats();
    expect([s.score, s.correct, s.maxCombo, Number(s.playTimeSec.toFixed(3)), g.spawnedCount]).toEqual([score, correct, maxCombo, playTime, spawned]);
    expect(fnv(seq)).toBe(seqHash);
    expect(fnv(g.pressLog.map((p) => p.t + p.side).join(','))).toBe(logHash);
    // サーバーの再計算でも同じ点数
    expect(replay(seed, decodeLog(encodeLog(g.pressLog)!)!, d).score).toBe(score);
  });
});
