/** 自己ベスト・音の設定・前回の名前の保存（D-16・D-24、詳細設計 10.2・16.9）。保存できない環境でも動く。 */
const KEY = 'haniwa-dogu-sort/v1';

export interface SaveData {
  bestScore: number;
  muted: boolean;
  /** ランキングに前回登録した名前（D-24 案B） */
  lastName: string;
}

export function load(): SaveData {
  const def: SaveData = { bestScore: 0, muted: false, lastName: '' };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const v = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestScore: typeof v.bestScore === 'number' && Number.isFinite(v.bestScore) ? v.bestScore : 0,
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
