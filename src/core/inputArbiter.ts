import type { Side } from './types';

/**
 * 同時押しと長押しの仲裁（D-06、詳細設計 6.1）。
 * - 押下中の入力元からの再押下（リピート）は無視
 * - 反対側に押下中の入力元があり、かつ反対側が最後に受け付けた押下から simulWindowSec 以内なら無視
 */
export class InputArbiter {
  private held = new Map<string, Side>();
  private lastAccepted: Record<Side, number> = { L: -Infinity, R: -Infinity };

  constructor(private readonly simulWindowSec: number) {}

  /** 受け付けたら true */
  down(source: string, side: Side, t: number): boolean {
    if (this.held.has(source)) return false;
    this.held.set(source, side);
    const opp: Side = side === 'L' ? 'R' : 'L';
    if (this.isHeld(opp) && t - this.lastAccepted[opp] <= this.simulWindowSec) return false;
    this.lastAccepted[side] = t;
    return true;
  }

  up(source: string): void {
    this.held.delete(source);
  }

  reset(): void {
    this.held.clear();
  }

  isHeld(side: Side): boolean {
    for (const s of this.held.values()) if (s === side) return true;
    return false;
  }
}
