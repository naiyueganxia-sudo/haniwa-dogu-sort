import type { GameConfig, Derived } from './config';
import type { Zone } from './types';

/** 出土品の中心 y からエリアを決める（境界は上側を含む。詳細設計 2.2） */
export function zoneOf(y: number, cfg: GameConfig, d: Derived): Zone {
  if (y >= cfg.judgeY) return 'passed';
  if (y >= d.normalStart) return 'normal';
  if (y >= d.earlyStart) return 'early';
  return 'waiting';
}
