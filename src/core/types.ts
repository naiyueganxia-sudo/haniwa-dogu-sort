export type Category = 'haniwa' | 'dogu';
export type Side = 'L' | 'R';

/** 左 = はにわ、右 = 土偶 */
export const SIDE_OF: Record<Category, Side> = { haniwa: 'L', dogu: 'R' };

export interface Look {
  palette: number;
  scale: number;
  rotDeg: number;
  flip: boolean;
}

export interface Item {
  id: number;
  category: Category;
  variantId: string;
  look: Look;
  /** 出現時のコンベア累計移動距離 */
  spawnD: number;
}

export type Zone = 'waiting' | 'early' | 'normal' | 'passed';

export type GameEvent =
  | { type: 'spawn'; t: number; item: Item }
  | { type: 'correct'; t: number; item: Item; y: number; side: Side; points: number; mult: number; combo: number }
  | { type: 'wrong'; t: number; item: Item; y: number; side: Side }
  | { type: 'passed'; t: number; item: Item }
  | { type: 'milestone'; t: number; combo: number; mult: number }
  | { type: 'gameover'; t: number };

export type PressResult = 'correct' | 'wrong' | 'ignored-over' | 'ignored-empty' | 'ignored-waiting';

export interface Stats {
  score: number;
  correct: number;
  sorted: number;
  misses: number;
  wrong: number;
  passed: number;
  maxCombo: number;
  /** 0〜1。分母0なら null */
  accuracy: number | null;
  playTimeSec: number;
}
