import { RULE_VERSION } from '../core/config';
import type {
  RankEntry,
  RankingResponse,
  RunResponse,
  SubmitError,
  SubmitRequest,
  SubmitResponse,
} from '../core/rankingTypes';

/**
 * ランキングのサーバーとの通信（詳細設計 16.10）。
 * 1回の通信は5秒で打ち切る。失敗してもゲームの進行には影響させない。
 */

const BASE = ((import.meta.env.VITE_RANKING_API as string | undefined) ?? '').replace(/\/+$/, '');
const TIMEOUT_MS = 5000;
/** 整理券の有効期限（24時間）より少し前に捨てる */
const RUN_MAX_AGE_MS = 23 * 60 * 60 * 1000;

export type SubmitResult = { ok: true; res: SubmitResponse } | { ok: false; error: SubmitError | 'network' };

export interface Run {
  token: string;
  seed: number;
  gotAt: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; data: unknown }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, { ...init, signal: ac.signal, cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as unknown;
    return res.ok ? { ok: true, data: data as T } : { ok: false, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export class RankingClient {
  /** ビルド時に通信先が設定されていなければ、ランキングの機能を出さない */
  readonly enabled = BASE !== '';
  private run: Run | null = null;
  private runLoading = false;
  /** 直近に受け取った上位の表 */
  entries: RankEntry[] | null = null;

  /** 次のゲーム用の整理券を先に取っておく（16.4） */
  prefetchRun(): void {
    if (!this.enabled || this.runLoading) return;
    if (this.run && Date.now() - this.run.gotAt < RUN_MAX_AGE_MS) return;
    this.runLoading = true;
    call<RunResponse>('/api/run')
      .then((r) => {
        if (r.ok && r.data.ruleVersion === RULE_VERSION && typeof r.data.token === 'string' && Number.isInteger(r.data.seed)) {
          this.run = { token: r.data.token, seed: r.data.seed >>> 0, gotAt: Date.now() };
        }
      })
      .catch(() => undefined)
      .finally(() => (this.runLoading = false));
  }

  /** ゲーム開始時に整理券を受け取る。手元になければ null（そのプレイは登録できない） */
  takeRun(): Run | null {
    const r = this.run;
    this.run = null;
    if (!r || Date.now() - r.gotAt >= RUN_MAX_AGE_MS) return null;
    return r;
  }

  async fetchRanking(): Promise<RankEntry[] | null> {
    if (!this.enabled) return null;
    try {
      const r = await call<RankingResponse>('/api/ranking');
      if (!r.ok || !Array.isArray(r.data.entries)) return null;
      this.entries = r.data.entries;
      return this.entries;
    } catch {
      return null;
    }
  }

  async submit(req: Omit<SubmitRequest, 'ruleVersion'>): Promise<SubmitResult> {
    try {
      const body: SubmitRequest = { ...req, ruleVersion: RULE_VERSION };
      // text/plain にして事前確認（preflight）の往復を省く
      const r = await call<SubmitResponse>('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        this.entries = r.data.entries;
        return { ok: true, res: r.data };
      }
      const err = (r.data as { error?: SubmitError } | null)?.error;
      return { ok: false, error: err ?? 'server' };
    } catch {
      return { ok: false, error: 'network' };
    }
  }
}
