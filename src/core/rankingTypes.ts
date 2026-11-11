import type { Difficulty } from './config';

/** ランキングの通信の形（詳細設計 16.8・17.5）。ブラウザとサーバーで共用する。 */

export const RANKING_SIZE = 30;

export interface RankEntry {
  id: number;
  rank: number;
  name: string;
  score: number;
  /** 登録時刻（ミリ秒） */
  at: number;
  difficulty: Difficulty;
}

export interface RunResponse {
  token: string;
  seed: number;
  ruleVersion: number;
}

export interface RankingResponse {
  entries: RankEntry[];
  ruleVersion: number;
}

export interface SubmitRequest {
  token: string;
  name: string;
  log: string;
  score: number;
  difficulty: Difficulty;
  ruleVersion: number;
}

export interface SubmitResponse {
  id: number;
  /** 全体の順位 */
  rank: number;
  /** その難易度の中の順位（詳細設計 17.11） */
  diffRank: number;
  /** 全体の上位30件 */
  entries: RankEntry[];
}

/** ランキングの絞り込み（D-38）。'all' は全体 */
export type RankFilter = Difficulty | 'all';

export type SubmitError =
  | 'origin'
  | 'rate'
  | 'name'
  | 'version'
  | 'token'
  | 'duplicate'
  | 'invalid'
  | 'toolarge'
  | 'server';

/** 上位の並び（点数の高い順・同点は先に登録した順）に順位をつける。同点は同じ順位 */
export function withRanks<T extends { score: number }>(rows: readonly T[]): (T & { rank: number })[] {
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || r.score !== rows[i - 1]!.score) rank = i + 1;
    return { ...r, rank };
  });
}

/**
 * この点数でランキングの表（上位30件）に入れるか（D-23、R2：同点では入れない）。
 * 入れるなら予想順位、入れないなら null
 */
export function qualifyRank(entries: readonly RankEntry[], score: number): number | null {
  if (score <= 0) return null;
  if (entries.length >= RANKING_SIZE && score <= entries[RANKING_SIZE - 1]!.score) return null;
  return entries.filter((e) => e.score > score).length + 1;
}
