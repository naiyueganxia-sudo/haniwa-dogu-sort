import type { Difficulty } from '../../src/core/config';

/** ランキングの保存先（詳細設計 16.7・17.5）。本番は D1、テストはメモリ上の模造品を使う。 */

export interface ScoreRow {
  id: number;
  name: string;
  score: number;
  /** 登録時刻（ミリ秒） */
  createdAt: number;
  difficulty: Difficulty;
}

export interface NewScore {
  runId: string;
  name: string;
  score: number;
  maxCombo: number;
  playMs: number;
  ruleVer: number;
  createdAt: number;
  difficulty: Difficulty;
}

export interface Store {
  /** 点数の高い順（同点は先に登録した順）に n 件。difficulty を渡すとその難易度だけ */
  top(n: number, difficulty?: Difficulty): Promise<ScoreRow[]>;
  /** 点数が score より高い記録の件数。difficulty を渡すとその難易度だけ */
  countAbove(score: number, difficulty?: Difficulty): Promise<number>;
  hasRun(runId: string): Promise<boolean>;
  /** 登録して id を返す。run_id が重複していたら null */
  insert(s: NewScore): Promise<number | null>;
  /** ip_hash の since 以降の登録回数を数え、今回の分を記録する（古い記録は消す） */
  hitRate(ipHash: string, now: number, since: number, purgeBefore: number): Promise<number>;
}

/** テスト用：メモリ上の保存先 */
export class MemoryStore implements Store {
  rows: (NewScore & { id: number })[] = [];
  rate: { ipHash: string; at: number }[] = [];
  private nextId = 1;

  private sorted() {
    return [...this.rows].sort((a, b) => b.score - a.score || a.createdAt - b.createdAt || a.id - b.id);
  }
  async top(n: number, difficulty?: Difficulty): Promise<ScoreRow[]> {
    return this.sorted()
      .filter((r) => !difficulty || r.difficulty === difficulty)
      .slice(0, n)
      .map((r) => ({ id: r.id, name: r.name, score: r.score, createdAt: r.createdAt, difficulty: r.difficulty }));
  }
  async countAbove(score: number, difficulty?: Difficulty): Promise<number> {
    return this.rows.filter((r) => r.score > score && (!difficulty || r.difficulty === difficulty)).length;
  }
  async hasRun(runId: string): Promise<boolean> {
    return this.rows.some((r) => r.runId === runId);
  }
  async insert(s: NewScore): Promise<number | null> {
    if (await this.hasRun(s.runId)) return null;
    const id = this.nextId++;
    this.rows.push({ ...s, id });
    return id;
  }
  async hitRate(ipHash: string, now: number, since: number, purgeBefore: number): Promise<number> {
    this.rate = this.rate.filter((r) => r.at >= purgeBefore);
    const n = this.rate.filter((r) => r.ipHash === ipHash && r.at >= since).length;
    this.rate.push({ ipHash, at: now });
    return n;
  }
}
