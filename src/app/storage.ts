/** ベストスコアと音の設定の保存（D-16、詳細設計 10.2）。保存できない環境でも動く。 */
const KEY = 'haniwa-dogu-sort/v1';

export interface SaveData {
  bestScore: number;
  muted: boolean;
}

export function load(): SaveData {
  const def: SaveData = { bestScore: 0, muted: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const v = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestScore: typeof v.bestScore === 'number' && Number.isFinite(v.bestScore) ? v.bestScore : 0,
      muted: v.muted === true,
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
