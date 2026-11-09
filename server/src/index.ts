import { createHandler } from './handler';
import type { NewScore, ScoreRow, Store } from './store';

/**
 * Cloudflare Workers の入口（詳細設計 16.1）。
 * D1 の型は使う部分だけをここで定義する（@cloudflare/workers-types を入れないため）。
 */
interface D1Result<T> {
  results: T[];
}
interface D1Prepared {
  bind(...values: unknown[]): D1Prepared;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(sql: string): D1Prepared;
  batch(stmts: D1Prepared[]): Promise<unknown[]>;
}

export interface Env {
  DB: D1Database;
  /** 整理券の署名と接続元のハッシュに使う秘密の鍵（wrangler secret で登録） */
  TOKEN_SECRET: string;
  /** 受け付ける呼び出し元（カンマ区切り） */
  ALLOWED_ORIGINS: string;
}

class D1Store implements Store {
  constructor(private db: D1Database) {}

  async top(n: number): Promise<ScoreRow[]> {
    const r = await this.db
      .prepare('SELECT id, name, score, created_at AS createdAt FROM scores ORDER BY score DESC, created_at ASC, id ASC LIMIT ?')
      .bind(n)
      .all<ScoreRow>();
    return r.results;
  }

  async countAbove(score: number): Promise<number> {
    const r = await this.db.prepare('SELECT COUNT(*) AS n FROM scores WHERE score > ?').bind(score).first<{ n: number }>();
    return r?.n ?? 0;
  }

  async hasRun(runId: string): Promise<boolean> {
    const r = await this.db.prepare('SELECT 1 AS x FROM scores WHERE run_id = ?').bind(runId).first();
    return r !== null;
  }

  async insert(s: NewScore): Promise<number | null> {
    const r = await this.db
      .prepare(
        'INSERT INTO scores (run_id, name, score, max_combo, play_ms, rule_ver, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO NOTHING RETURNING id',
      )
      .bind(s.runId, s.name, s.score, s.maxCombo, s.playMs, s.ruleVer, s.createdAt)
      .first<{ id: number }>();
    return r?.id ?? null;
  }

  async hitRate(ipHash: string, now: number, since: number, purgeBefore: number): Promise<number> {
    const [, count] = (await this.db.batch([
      this.db.prepare('DELETE FROM rate WHERE at < ?').bind(purgeBefore),
      this.db.prepare('SELECT COUNT(*) AS n FROM rate WHERE ip_hash = ? AND at >= ?').bind(ipHash, since),
      this.db.prepare('INSERT INTO rate (ip_hash, at) VALUES (?, ?)').bind(ipHash, now),
    ])) as [unknown, D1Result<{ n: number }>, unknown];
    return count.results[0]?.n ?? 0;
  }
}

let handler: ((req: Request) => Promise<Response>) | null = null;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    handler ??= createHandler({
      store: new D1Store(env.DB),
      secret: env.TOKEN_SECRET,
      allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    });
    return handler(req);
  },
};
