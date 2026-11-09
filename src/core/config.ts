/**
 * ゲームの調整値（詳細設計書 第11章）。
 * ロジックは論理座標（判定ライン = 1000）で動き、描画時だけ画面に合わせて拡大縮小する。
 */

/**
 * ルールの版（詳細設計 16.11）。DEFAULT_CONFIG の値やゲーム本体の計算を変えたら1つ上げ、
 * ランキングのサーバーも同時に更新する（同じ操作でも結果が変わり、古い記録を再計算できなくなるため）。
 */
export const RULE_VERSION = 1;

export type Point = readonly [x: number, y: number];

export interface GameConfig {
  // 座標
  judgeY: number;
  viewBottom: number;
  itemSize: number;
  spawnY: number;
  beltWidth: number;
  minSpacing: number;
  // 速度・判定
  baseTravelSec: number;
  earlyWindowSec: number;
  normalWindowSec: number;
  // 難易度（n = 累計出現数）
  intervalPoints: readonly Point[];
  speedPoints: readonly Point[];
  // 得点
  basePoints: number;
  multiplierTable: readonly { minCombo: number; mult: number }[];
  milestones: readonly number[];
  milestoneEveryAfter: number;
  maxMisses: number;
  // 出現
  patternWeights: { random: number; streak: number; alternate: number; bias: number };
  patternBlock: number;
  streakSame: number;
  altSwitch: number;
  biasRatio: number;
  probMin: number;
  // 見た目
  lookScale: readonly [number, number];
  lookRotDeg: number;
  lookFlip: number;
  paletteSize: number;
  // 入力・時間
  simulWindowSec: number;
  maxFrameAdvanceSec: number;
  gameoverAnimSec: number;
  retryLockSec: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  judgeY: 1000,
  viewBottom: 1060,
  itemSize: 170,
  spawnY: -85,
  beltWidth: 260,
  minSpacing: 200,

  baseTravelSec: 3.5,
  earlyWindowSec: 0.35,
  normalWindowSec: 1.15,

  intervalPoints: [
    [0, 1.8],
    [20, 1.4],
    [50, 1.1],
    [100, 0.85],
    [150, 0.7],
  ],
  speedPoints: [
    [0, 1.0],
    [150, 1.0],
    [250, 1.3],
    [400, 1.7],
    [600, 2.2],
    [900, 3.0],
  ],

  basePoints: 100,
  multiplierTable: [
    { minCombo: 0, mult: 1.0 },
    { minCombo: 10, mult: 1.2 },
    { minCombo: 20, mult: 1.5 },
    { minCombo: 40, mult: 2.0 },
    { minCombo: 70, mult: 2.5 },
    { minCombo: 100, mult: 3.0 },
  ],
  milestones: [10, 20, 40, 70, 100],
  milestoneEveryAfter: 50,
  maxMisses: 3,

  patternWeights: { random: 50, streak: 20, alternate: 15, bias: 15 },
  patternBlock: 8,
  streakSame: 0.75,
  altSwitch: 0.8,
  biasRatio: 0.75,
  probMin: 0.2,

  lookScale: [0.92, 1.04],
  lookRotDeg: 5,
  lookFlip: 0.5,
  paletteSize: 6,

  simulWindowSec: 0.04,
  maxFrameAdvanceSec: 0.1,
  gameoverAnimSec: 1.0,
  retryLockSec: 0.8,
};

/** 設定から導かれる値 */
export interface Derived {
  baseSpeed: number;
  earlyStart: number;
  normalStart: number;
}

export function derive(cfg: GameConfig): Derived {
  const baseSpeed = cfg.judgeY / cfg.baseTravelSec;
  const normalStart = cfg.judgeY - cfg.normalWindowSec * baseSpeed;
  const earlyStart = normalStart - cfg.earlyWindowSec * baseSpeed;
  return { baseSpeed, earlyStart, normalStart };
}
