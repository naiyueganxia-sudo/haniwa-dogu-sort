/**
 * 効果音（D-15、詳細設計 10.1）。Web Audio API で合成し、音声ファイルは使わない。
 * iPhoneのSafariではユーザー操作の中で unlock() を呼ぶ必要がある（P-21）。
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime + start;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** 正解。倍率が上がるほど少し高い音 */
  correct(mult: number): void {
    const base = 660 * (1 + (mult - 1) * 0.25);
    this.tone(base, 0, 0.09, 'triangle', 0.5);
    this.tone(base * 1.5, 0.03, 0.08, 'sine', 0.25);
  }

  wrong(): void {
    this.tone(150, 0, 0.22, 'sawtooth', 0.35, 110);
    this.tone(155, 0, 0.22, 'square', 0.12, 112);
  }

  passed(): void {
    this.tone(220, 0, 0.18, 'sine', 0.5, 90);
  }

  milestone(): void {
    [0, 4, 7, 12].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), i * 0.06, 0.14, 'triangle', 0.4));
  }

  gameover(): void {
    [12, 7, 3, 0].forEach((n, i) => this.tone(330 * Math.pow(2, n / 12), i * 0.12, 0.22, 'triangle', 0.4));
  }

  click(): void {
    this.tone(880, 0, 0.04, 'sine', 0.2);
  }
}
