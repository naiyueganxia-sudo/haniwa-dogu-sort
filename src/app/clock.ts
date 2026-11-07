/**
 * ゲーム時刻（詳細設計 2.4）。一時停止中は進まない。1フレームで進む量に上限を設ける。
 * 実時間はすべて performance.now() と同じ基準（ミリ秒）。
 */
export class GameClock {
  time = 0;
  private lastReal = 0;
  running = false;

  constructor(private readonly maxAdvanceSec: number) {}

  start(nowMs: number): void {
    this.time = 0;
    this.lastReal = nowMs;
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  resume(nowMs: number): void {
    this.lastReal = nowMs;
    this.running = true;
  }

  /** フレームごとに呼ぶ */
  tick(nowMs: number): number {
    if (this.running) {
      const dt = Math.max(0, (nowMs - this.lastReal) / 1000);
      this.time += Math.min(dt, this.maxAdvanceSec);
      this.lastReal = nowMs;
    }
    return this.time;
  }

  /** 入力イベントの発生時刻（ms）をゲーム時刻に換算 */
  timeAt(eventMs: number): number {
    if (!this.running) return this.time;
    const dt = (eventMs - this.lastReal) / 1000;
    return this.time + Math.min(Math.max(dt, -1), this.maxAdvanceSec);
  }
}

/** event.timeStamp が performance.now() と同じ基準でない環境への備え */
export function eventTime(e: Event): number {
  const now = performance.now();
  const ts = e.timeStamp;
  if (!ts || ts > now + 50 || ts < now - 1000) return now;
  return ts;
}
