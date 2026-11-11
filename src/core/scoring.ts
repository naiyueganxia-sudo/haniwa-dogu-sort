import type { GameConfig } from './config';

/** コンボ数に対応する倍率（D-04：正解で+1した後のコンボ数を渡す） */
export function multiplierFor(combo: number, cfg: GameConfig): number {
  let mult = 1;
  for (const row of cfg.multiplierTable) {
    if (combo >= row.minCombo) mult = row.mult;
  }
  return mult;
}

/** 1回の正解の点数＝100×コンボ倍率×難易度倍率（四捨五入。D-31） */
export function pointsFor(combo: number, cfg: GameConfig, diffMult = 1): number {
  return Math.round(cfg.basePoints * multiplierFor(combo, cfg) * diffMult);
}

/** コンボの節目（D-18：10/20/40/70/100、以後50ごと） */
export function isMilestone(combo: number, cfg: GameConfig): boolean {
  if (cfg.milestones.includes(combo)) return true;
  const last = cfg.milestones[cfg.milestones.length - 1] ?? 0;
  return combo > last && (combo - last) % cfg.milestoneEveryAfter === 0;
}
