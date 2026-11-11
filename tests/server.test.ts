import { beforeEach, describe, expect, it } from 'vitest';
import { RULE_VERSION } from '../src/core/config';
import type { RankingResponse, RunResponse, SubmitResponse } from '../src/core/rankingTypes';
import { encodeLog } from '../src/core/replay';
import { createHandler, LIMITS } from '../server/src/handler';
import { MemoryStore } from '../server/src/store';
import { signTicket, verifyTicket } from '../server/src/token';
import { playLikeApp } from './helpers';

const ORIGIN = 'https://naiyueganxia-sudo.github.io';
const SECRET = 'test-secret';
const API = 'https://ranking.example';

let store: MemoryStore;
let clock: number;
let handle: (req: Request) => Promise<Response>;

beforeEach(() => {
  store = new MemoryStore();
  clock = 1_800_000_000_000;
  handle = createHandler({ store, secret: SECRET, now: () => clock, allowedOrigins: [ORIGIN] });
});

const get = async <T>(path: string) => (await (await handle(new Request(API + path, { headers: { Origin: ORIGIN } }))).json()) as T;

async function post(body: unknown, opt: { origin?: string | null; ip?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'text/plain', 'CF-Connecting-IP': opt.ip ?? '1.2.3.4' };
  if (opt.origin !== null) headers.Origin = opt.origin ?? ORIGIN;
  const res = await handle(new Request(API + '/api/scores', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as SubmitResponse & { error?: string } };
}

/** 整理券をもらって遊び、実際にかかった時間だけ時計を進めて、送る内容を作る */
async function playRun(rngSeed: number, opt: { stopAfterSec?: number; name?: string } = {}) {
  const run = await get<RunResponse>('/api/run');
  const g = playLikeApp(run.seed, rngSeed, { errorRate: 0.02, stopAfterSec: opt.stopAfterSec ?? 30 });
  clock += Math.round(g.overTime * 1000) + 5000;
  return {
    game: g,
    body: { token: run.token, name: opt.name ?? 'はにわ', log: encodeLog(g.pressLog)!, score: g.score, difficulty: 'normal', ruleVersion: RULE_VERSION },
  };
}

describe('整理券（詳細設計 16.4）', () => {
  it('署名を確かめられ、改ざんは拒否', async () => {
    const tk = { r: 'a'.repeat(24), s: 123, t: 1000, v: 1 };
    const token = await signTicket(tk, SECRET);
    expect(await verifyTicket(token, SECRET)).toEqual(tk);
    expect(await verifyTicket(token, 'other')).toBeNull();
    const [body, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ ...tk, s: 999 })).replace(/=+$/, '');
    expect(await verifyTicket(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(await verifyTicket(`${body}.${sig}.x`, SECRET)).toBeNull();
    expect(await verifyTicket(123, SECRET)).toBeNull();
    expect(await verifyTicket('', SECRET)).toBeNull();
  });

  it('GET /api/run は毎回ちがう種と整理券を返す', async () => {
    const a = await get<RunResponse>('/api/run');
    const b = await get<RunResponse>('/api/run');
    expect(a.ruleVersion).toBe(RULE_VERSION);
    expect(a.token).not.toBe(b.token);
    expect((await verifyTicket(a.token, SECRET))!.s).toBe(a.seed);
  });
});

describe('登録（詳細設計 16.5）', () => {
  it('正しく遊んだ記録は登録され、順位と上位の表が返る', async () => {
    const { body, game } = await playRun(1);
    expect(game.score).toBeGreaterThan(0);
    const r = await post(body);
    expect(r.status).toBe(200);
    expect(r.body.rank).toBe(1);
    expect(r.body.entries).toEqual([{ id: r.body.id, rank: 1, name: 'はにわ', score: game.score, at: clock, difficulty: 'normal' }]);
    expect(store.rows[0]).toMatchObject({ maxCombo: game.maxCombo, playMs: Math.round(game.overTime * 1000), ruleVer: RULE_VERSION });
  });

  it('名前は整えて保存（全角英数字→半角、前後の空白）', async () => {
    const { body } = await playRun(2, { name: '  ＫＥＮ ' });
    expect((await post(body)).body.entries[0]!.name).toBe('KEN');
  });

  it('1. 呼び出し元が公開URL・localhost 以外なら拒否', async () => {
    const { body } = await playRun(3);
    expect((await post(body, { origin: null })).body.error).toBe('origin');
    expect((await post(body, { origin: 'https://evil.example' })).body.error).toBe('origin');
    expect((await post(body, { origin: 'http://localhost:5173' })).status).toBe(200);
  });

  it('2. 同じ接続元から10分に10回まで', async () => {
    for (let i = 0; i < LIMITS.rateMax; i++) expect((await post('{}', { ip: '9.9.9.9' })).body.error).toBe('name');
    expect((await post('{}', { ip: '9.9.9.9' })).body.error).toBe('rate');
    expect((await post('{}', { ip: '8.8.8.8' })).body.error).toBe('name');
    clock += LIMITS.rateWindowMs + 1;
    expect((await post('{}', { ip: '9.9.9.9' })).body.error).toBe('name');
  });

  it('3. 名前のルールに合わなければ拒否', async () => {
    const { body } = await playRun(4);
    expect((await post({ ...body, name: '' })).body.error).toBe('name');
    expect((await post({ ...body, name: 'あいうえおかきくけこさ' })).body.error).toBe('name');
    expect((await post({ ...body, name: 'しね' })).body.error).toBe('name');
  });

  it('4. 整理券の改ざん・期限切れ・版違いは拒否', async () => {
    const { body } = await playRun(5);
    expect((await post({ ...body, token: body.token.slice(0, -2) + 'AA' })).body.error).toBe('token');
    expect((await post({ ...body, ruleVersion: RULE_VERSION + 1 })).body.error).toBe('version');
    const old = await signTicket({ r: 'b'.repeat(24), s: 1, t: clock, v: RULE_VERSION - 1 }, SECRET);
    expect((await post({ ...body, token: old })).body.error).toBe('version');
    clock += LIMITS.ticketTtlMs;
    expect((await post(body)).body.error).toBe('token');
  });

  it('5. 同じ整理券は2回使えない', async () => {
    const { body } = await playRun(6);
    expect((await post(body)).status).toBe(200);
    expect((await post(body)).body.error).toBe('duplicate');
  });

  it('6. 点数の書き換え・記録の改ざん・別の種の記録は拒否', async () => {
    const { body } = await playRun(7);
    expect((await post({ ...body, score: body.score + 100 })).body.error).toBe('invalid');
    expect((await post({ ...body, log: body.log.split(',').slice(0, 10).join(',') })).body.error).toBe('invalid');
    expect((await post({ ...body, log: 'not a log' })).body.error).toBe('invalid');
    const other = await playRun(8);
    expect((await post({ ...body, log: other.body.log, score: other.body.score })).body.error).toBe('invalid');
    expect((await post('not json')).body.error).toBe('invalid');
  });

  it('0点は登録できない', async () => {
    const run = await get<RunResponse>('/api/run');
    clock += 60_000;
    expect((await post({ token: run.token, name: 'a', log: '', score: 0, difficulty: 'normal', ruleVersion: RULE_VERSION })).body.error).toBe('invalid');
  });

  it('7. 発行からの実際の経過時間がプレイ時間より短ければ拒否', async () => {
    const run = await get<RunResponse>('/api/run');
    const g = playLikeApp(run.seed, 9, { stopAfterSec: 60 });
    clock += Math.round(g.overTime * 1000) - LIMITS.wallSlackMs - 1000;
    const body = { token: run.token, name: 'a', log: encodeLog(g.pressLog)!, score: g.score, difficulty: 'normal', ruleVersion: RULE_VERSION };
    expect((await post(body)).body.error).toBe('invalid');
    clock += 2000;
    expect((await post(body)).status).toBe(200);
  });

  it('大きすぎる送信は拒否', async () => {
    expect((await post('x'.repeat(LIMITS.maxBodyBytes + 1))).body.error).toBe('toolarge');
  });
});

describe('難易度（詳細設計 17.5）', () => {
  async function playDiff(rngSeed: number, difficulty: 'easy' | 'normal' | 'hard' | 'extreme') {
    const run = await get<RunResponse>('/api/run');
    const g = playLikeApp(run.seed, rngSeed, { errorRate: 0.02, stopAfterSec: 30, difficulty });
    clock += Math.round(g.overTime * 1000) + 5000;
    return { g, body: { token: run.token, name: 'どぐう', log: encodeLog(g.pressLog)!, score: g.score, difficulty, ruleVersion: RULE_VERSION } };
  }

  it('難易度つきで登録でき、ランキングに難易度が付く', async () => {
    const { g, body } = await playDiff(40, 'extreme');
    const r = await post(body);
    expect(r.status).toBe(200);
    expect(r.body.entries[0]).toMatchObject({ score: g.score, difficulty: 'extreme' });
    expect(store.rows[0]!.difficulty).toBe('extreme');
  });

  it('難易度を偽った記録・知らない難易度は拒否', async () => {
    const { body } = await playDiff(41, 'easy');
    expect((await post({ ...body, difficulty: 'extreme', score: body.score * 4 })).body.error).toBe('invalid');
    expect((await post({ ...body, difficulty: 'oni' })).body.error).toBe('invalid');
    expect((await post({ ...body, difficulty: undefined })).body.error).toBe('invalid');
    expect((await post(body)).status).toBe(200);
  });

  it('難易度で絞り込むと、その難易度だけの上位30位（順位もその中で数える。D-38）', async () => {
    let t = 1;
    const add = (name: string, score: number, difficulty: 'easy' | 'normal' | 'hard' | 'extreme') =>
      store.insert({ runId: `f${t}`, name, score, maxCombo: 0, playMs: 0, ruleVer: RULE_VERSION, createdAt: t++, difficulty });
    await add('a', 900, 'extreme');
    await add('b', 800, 'easy');
    await add('c', 700, 'extreme');
    for (let i = 0; i < 35; i++) await add(`e${i}`, 100 + i, 'easy');
    const all = await get<RankingResponse>('/api/ranking');
    const ex = await get<RankingResponse>('/api/ranking?difficulty=extreme');
    const easy = await get<RankingResponse>('/api/ranking?difficulty=easy');
    expect(all.entries.length).toBe(30);
    expect(ex.entries.map((e) => [e.rank, e.name, e.difficulty])).toEqual([
      [1, 'a', 'extreme'],
      [2, 'c', 'extreme'],
    ]);
    expect(easy.entries.length).toBe(30);
    expect(easy.entries[0]).toMatchObject({ rank: 1, name: 'b' });
    expect(easy.entries.every((e) => e.difficulty === 'easy')).toBe(true);
    // 知らない値は全体
    expect((await get<RankingResponse>('/api/ranking?difficulty=oni')).entries.length).toBe(30);
  });

  it('登録の応答に、全体の順位と難易度の中の順位が入る（D-39）', async () => {
    await store.insert({ runId: 'x1', name: 'top', score: 99999, maxCombo: 0, playMs: 0, ruleVer: RULE_VERSION, createdAt: 0, difficulty: 'normal' });
    const { body } = await playDiff(43, 'hard');
    const r = await post(body);
    expect(r.status).toBe(200);
    expect(r.body.rank).toBe(2);
    expect(r.body.diffRank).toBe(1);
  });

  it('ルールの版1（難易度がない）ページからの送信は「再読み込み」', async () => {
    const { body } = await playDiff(42, 'normal');
    expect((await post({ ...body, ruleVersion: 1 })).body.error).toBe('version');
  });
});

describe('ランキング（D-22・D-26）', () => {
  it('点数の高い順、同点は先に登録した方が上で同じ順位。上位30件まで', async () => {
    let t = 1;
    const add = (name: string, score: number) =>
      store.insert({ runId: `r${t}`, name, score, maxCombo: 0, playMs: 0, ruleVer: RULE_VERSION, createdAt: t++, difficulty: 'normal' });
    await add('a', 500);
    await add('b', 900);
    await add('c', 500);
    await add('d', 300);
    for (let i = 0; i < 40; i++) await add(`x${i}`, 100);
    const r = await get<RankingResponse>('/api/ranking');
    expect(r.entries.length).toBe(30);
    expect(r.entries.slice(0, 4).map((e) => [e.rank, e.name])).toEqual([
      [1, 'b'],
      [2, 'a'],
      [2, 'c'],
      [4, 'd'],
    ]);
    expect(r.entries[4]!.rank).toBe(5);
    expect(r.entries[29]!.rank).toBe(5);
  });

  it('同じ名前で何件でも登録できる（C-53）', async () => {
    for (let i = 0; i < 3; i++) expect((await post((await playRun(20 + i, { name: 'どぐう' })).body)).status).toBe(200);
    expect((await get<RankingResponse>('/api/ranking')).entries.filter((e) => e.name === 'どぐう').length).toBe(3);
  });

  it('ランキングは10秒キャッシュ。登録した本人には最新の表を返す', async () => {
    expect((await get<RankingResponse>('/api/ranking')).entries.length).toBe(0);
    await store.insert({ runId: 'zz', name: 'z', score: 1, maxCombo: 0, playMs: 0, ruleVer: 1, createdAt: 0, difficulty: 'normal' });
    expect((await get<RankingResponse>('/api/ranking')).entries.length).toBe(0);
    clock += LIMITS.rankingCacheMs;
    expect((await get<RankingResponse>('/api/ranking')).entries.length).toBe(1);
    const r = await post((await playRun(30)).body);
    expect(r.body.entries.length).toBe(2);
  });

  it('CORS：公開URLには許可ヘッダーを返し、それ以外には返さない', async () => {
    const ok = await handle(new Request(API + '/api/ranking', { headers: { Origin: ORIGIN } }));
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const ng = await handle(new Request(API + '/api/ranking', { headers: { Origin: 'https://evil.example' } }));
    expect(ng.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const pre = await handle(new Request(API + '/api/scores', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }));
    expect(pre.status).toBe(204);
    expect((await handle(new Request(API + '/nope'))).status).toBe(404);
  });
});
