import { DIFFICULTY_ORDER, isDifficulty, type Difficulty } from '../core/config';

/**
 * 自己ベスト（難易度ごと）・前回の難易度・音の設定・前回の名前の保存
 * （D-16・D-24・D-33、詳細設計 10.2・16.9・17.6）。保存できない環境でも動く。
 */
const KEY = 'haniwa-dogu-sort/v1';

export interface SaveData {
  /** 難易度ごとの自己ベスト */
  best: Record<Difficulty, number>;
  /** 前回選んだ難易度（初めての人は「ふつう」） */
  lastDifficulty: Difficulty;
  muted: boolean;
  /** ランキングに前回登録した名前（D-24 案B） */
  lastName: string;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

function emptyBest(): Record<Difficulty, number> {
  return { easy: 0, normal: 0, hard: 0, extreme: 0 };
}

export function load(): SaveData {
  const def: SaveData = { best: emptyBest(), lastDifficulty: 'normal', muted: false, lastName: '' };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const v = JSON.parse(raw) as Partial<SaveData> & { bestScore?: unknown };
    const best = emptyBest();
    if (v.best && typeof v.best === 'object') {
      for (const d of DIFFICULTY_ORDER) best[d] = num((v.best as Record<string, unknown>)[d]);
    }
    // 難易度を追加する前の自己ベストは「ふつう」に引き継ぐ（D-33）
    if (v.bestScore !== undefined) best.normal = Math.max(best.normal, num(v.bestScore));
    return {
      best,
      lastDifficulty: isDifficulty(v.lastDifficulty) ? v.lastDifficulty : 'normal',
      muted: v.muted === true,
      lastName: typeof v.lastName === 'string' ? v.lastName.slice(0, 40) : '',
    };
  } catch {
    return def;
  }
}

export function save(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* プライベートブラウズなどで保存できない場合は何もしない */
  }
}
