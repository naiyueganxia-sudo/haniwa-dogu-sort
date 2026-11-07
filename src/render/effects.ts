import type { Item, Side } from '../core/types';

/**
 * 演出（詳細設計 8.2）。時間は実時間（秒）。ロジックから外れた出土品の見た目だけを扱う。
 * 配列は使い回し、期限切れは詰めて消す（長時間でも増え続けない）。
 */

export interface Flyer {
  item: Item;
  x0: number;
  y0: number;
  side: Side;
  wrong: boolean;
  t0: number;
  dur: number;
  arrived: boolean;
}

export interface Faller {
  item: Item;
  x: number;
  y0: number;
  t0: number;
  dur: number;
}

export interface Popup {
  text: string;
  x: number;
  y: number;
  color: string;
  t0: number;
  dur: number;
  size: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  t0: number;
  dur: number;
  r: number;
}

export interface BoxFlash {
  side: Side;
  good: boolean;
  t0: number;
}

export class Effects {
  flyers: Flyer[] = [];
  fallers: Faller[] = [];
  popups: Popup[] = [];
  particles: Particle[] = [];
  flashes: BoxFlash[] = [];
  maxParticles = 64;

  clear(): void {
    this.flyers.length = 0;
    this.fallers.length = 0;
    this.popups.length = 0;
    this.particles.length = 0;
    this.flashes.length = 0;
  }

  burst(x: number, y: number, color: string, n: number, now: number): void {
    for (let i = 0; i < n && this.particles.length < this.maxParticles; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        color,
        t0: now,
        dur: 0.35 + Math.random() * 0.25,
        r: 1.5 + Math.random() * 2.5,
      });
    }
  }

  /** 期限切れを詰めて消す */
  prune(now: number): void {
    compact(this.flyers, (f) => now - f.t0 < f.dur + 0.05);
    compact(this.fallers, (f) => now - f.t0 < f.dur);
    compact(this.popups, (p) => now - p.t0 < p.dur);
    compact(this.particles, (p) => now - p.t0 < p.dur);
    compact(this.flashes, (f) => now - f.t0 < 0.3);
  }
}

function compact<T>(arr: T[], keep: (v: T) => boolean): void {
  let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]!;
    if (keep(v)) arr[j++] = v;
  }
  arr.length = j;
}
