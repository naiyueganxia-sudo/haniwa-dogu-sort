import { ARTIFACTS, variantsOf } from '../data/artifacts';
import { DIFFICULTIES } from './config';
import type { Category } from './types';

/**
 * 難易度カスタムの設定（要件定義書 第11章、詳細設計 19.2）。
 * ランキングには使わない。
 */
export interface CustomSettings {
  /** 選んだ出土品の id（全体で1つ以上。D-46） */
  variants: string[];
  /** 速さの倍率 ×0.5〜×3.0、0.1刻み（D-49） */
  speed: number;
  /** 速度アップ：遊ぶほど間隔が詰まり、速くなる（C-69） */
  speedUp: boolean;
}

export const CUSTOM_SPEED_MIN = 0.5;
export const CUSTOM_SPEED_MAX = 3.0;
export const CUSTOM_SPEED_STEP = 0.1;
export const CUSTOM_NAME = 'カスタム';

/** 初期設定（R19）：「ふつう」の最初と同じく、はにわ・土偶とも一覧の先頭から4種、×1.0、速度アップ ON */
export function defaultCustom(): CustomSettings {
  const n = DIFFICULTIES.normal.startVariants;
  return {
    variants: [...firstN('haniwa', n), ...firstN('dogu', n)],
    speed: 1,
    speedUp: true,
  };
}

/** 分類の一覧の先頭から n 個の id */
export function firstN(cat: Category, n: number): string[] {
  return variantsOf(cat)
    .slice(0, Math.max(0, n))
    .map((v) => v.id);
}

/** 速さを範囲に収め、0.1 単位にそろえる */
export function clampSpeed(x: number): number {
  if (!Number.isFinite(x)) return 1;
  const v = Math.min(CUSTOM_SPEED_MAX, Math.max(CUSTOM_SPEED_MIN, x));
  return Math.round(v * 10) / 10;
}

/** 保存データなどから読んだ値を整える。壊れていれば初期設定 */
export function normalizeCustom(raw: unknown): CustomSettings {
  const def = defaultCustom();
  if (!raw || typeof raw !== 'object') return def;
  const r = raw as Partial<CustomSettings>;
  const picked = new Set(Array.isArray(r.variants) ? r.variants.filter((v): v is string => typeof v === 'string') : []);
  // 一覧の順にそろえる（知らない id と重複はここで消える）
  const variants = ARTIFACTS.filter((a) => picked.has(a.id)).map((a) => a.id);
  if (variants.length === 0) return def;
  return {
    variants,
    speed: typeof r.speed === 'number' ? clampSpeed(r.speed) : 1,
    speedUp: typeof r.speedUp === 'boolean' ? r.speedUp : true,
  };
}

/** 選んだ数（分類ごと） */
export function customCounts(c: CustomSettings): Record<Category, number> {
  const set = new Set(c.variants);
  return {
    haniwa: variantsOf('haniwa').filter((v) => set.has(v.id)).length,
    dogu: variantsOf('dogu').filter((v) => set.has(v.id)).length,
  };
}

/** 速さの目安の言葉（D-49） */
export function speedLabel(x: number): string {
  const v = clampSpeed(x);
  if (v <= 0.6) return 'とてもゆっくり';
  if (v <= 0.9) return 'ゆっくり';
  if (v === 1) return 'ふつう';
  if (v <= 1.4) return 'はやい';
  if (v <= 1.9) return 'とてもはやい';
  return '激はや';
}

/** 「×1.3（はやい）」 */
export function speedText(x: number): string {
  return `×${clampSpeed(x).toFixed(1)}（${speedLabel(x)}）`;
}
