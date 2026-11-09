import { RULE_VERSION } from '../../src/core/config';
import { checkName } from '../../src/core/name';
import {
  RANKING_SIZE,
  withRanks,
  type RankEntry,
  type RankingResponse,
  type RunResponse,
  type SubmitError,
  type SubmitRequest,
  type SubmitResponse,
} from '../../src/core/rankingTypes';
import { decodeLog, MAX_LOG_LENGTH, replay } from '../../src/core/replay';
import type { ScoreRow, Store } from './store';
import { hashIp, randomId, randomSeed32, signTicket, verifyTicket } from './token';

/** 詳細設計 16.5・16.14 の数値 */
export const LIMITS = {
  rateWindowMs: 10 * 60 * 1000,
  rateMax: 10,
  ratePurgeMs: 60 * 60 * 1000,
  ticketTtlMs: 24 * 60 * 60 * 1000,
  wallSlackMs: 3000,
  rankingCacheMs: 10 * 1000,
  maxBodyBytes: MAX_LOG_LENGTH + 4096,
};

export interface HandlerDeps {
  store: Store;
  secret: string;
  now?: () => number;
  /** 受け付ける呼び出し元（公開URLのオリジン）。localhost は常に可 */
  allowedOrigins: readonly string[];
}

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function createHandler(deps: HandlerDeps): (req: Request) => Promise<Response> {
  const now = deps.now ?? (() => Date.now());
  let cache: { at: number; rows: ScoreRow[] } | null = null;

  const originOk = (o: string | null) => !!o && (deps.allowedOrigins.includes(o) || LOCAL_ORIGIN.test(o));

  const cors = (req: Request): Record<string, string> => {
    const o = req.headers.get('Origin');
    if (!originOk(o)) return {};
    return {
      'Access-Control-Allow-Origin': o!,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
  };

  const json = (req: Request, body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(req) },
    });

  const fail = (req: Request, error: SubmitError, status = 400) => json(req, { error }, status);

  const topRows = async (): Promise<ScoreRow[]> => {
    const t = now();
    if (cache && t - cache.at < LIMITS.rankingCacheMs) return cache.rows;
    const rows = await deps.store.top(RANKING_SIZE);
    cache = { at: t, rows };
    return rows;
  };

  const toEntries = (rows: readonly ScoreRow[]): RankEntry[] =>
    withRanks(rows).map((r) => ({ id: r.id, rank: r.rank, name: r.name, score: r.score, at: r.createdAt }));

  async function submit(req: Request): Promise<Response> {
    // 1. 呼び出し元
    if (!originOk(req.headers.get('Origin'))) return fail(req, 'origin', 403);
    // 2. 連続投稿の制限
    const t = now();
    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
    const ipHash = await hashIp(ip, deps.secret);
    const recent = await deps.store.hitRate(ipHash, t, t - LIMITS.rateWindowMs, t - LIMITS.ratePurgeMs);
    if (recent >= LIMITS.rateMax) return fail(req, 'rate', 429);

    const text = await req.text();
    if (text.length > LIMITS.maxBodyBytes) return fail(req, 'toolarge', 413);
    let body: Partial<SubmitRequest>;
    try {
      body = JSON.parse(text) as Partial<SubmitRequest>;
    } catch {
      return fail(req, 'invalid');
    }
    if (!body || typeof body !== 'object') return fail(req, 'invalid');

    // 3. 名前
    const nc = checkName(typeof body.name === 'string' ? body.name : '');
    if (!nc.ok) return fail(req, 'name');

    // 4. 整理券
    if (body.ruleVersion !== RULE_VERSION) return fail(req, 'version', 409);
    const ticket = await verifyTicket(body.token, deps.secret);
    if (!ticket) return fail(req, 'token');
    if (ticket.v !== RULE_VERSION) return fail(req, 'version', 409);
    if (t - ticket.t > LIMITS.ticketTtlMs || ticket.t > t + 60_000) return fail(req, 'token');

    // 5. 使い回し
    if (await deps.store.hasRun(ticket.r)) return fail(req, 'duplicate', 409);

    // 6. 再計算
    if (typeof body.log !== 'string') return fail(req, 'invalid');
    const presses = decodeLog(body.log);
    if (!presses) return fail(req, 'invalid');
    const g = replay(ticket.s, presses);
    const s = g.stats();
    if (g.status !== 'over' || s.score <= 0 || s.score !== body.score) return fail(req, 'invalid');
    const playMs = Math.round(s.playTimeSec * 1000);

    // 7. 実際の経過時間
    if (t - ticket.t < playMs - LIMITS.wallSlackMs) return fail(req, 'invalid');

    const id = await deps.store.insert({
      runId: ticket.r,
      name: nc.name,
      score: s.score,
      maxCombo: s.maxCombo,
      playMs,
      ruleVer: RULE_VERSION,
      createdAt: t,
    });
    if (id === null) return fail(req, 'duplicate', 409);
    cache = null;
    const rank = (await deps.store.countAbove(s.score)) + 1;
    const res: SubmitResponse = { id, rank, entries: toEntries(await topRows()) };
    return json(req, res);
  }

  return async (req: Request): Promise<Response> => {
    try {
      const path = new URL(req.url).pathname.replace(/\/+$/, '');
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
      if (req.method === 'GET' && path === '/api/run') {
        const seed = randomSeed32();
        const token = await signTicket({ r: randomId(), s: seed, t: now(), v: RULE_VERSION }, deps.secret);
        const res: RunResponse = { token, seed, ruleVersion: RULE_VERSION };
        return json(req, res);
      }
      if (req.method === 'GET' && path === '/api/ranking') {
        const res: RankingResponse = { entries: toEntries(await topRows()), ruleVersion: RULE_VERSION };
        return json(req, res);
      }
      if (req.method === 'POST' && path === '/api/scores') return await submit(req);
      return json(req, { error: 'notfound' }, 404);
    } catch (e) {
      console.error(e);
      return fail(req, 'server', 500);
    }
  };
}
