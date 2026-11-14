import { variantCountAt, type GameConfig, type PlayMode } from './config';
import type { CustomSettings } from './custom';
import type { Rng } from './rng';
import type { Category, Look } from './types';
import { variantsOf } from '../data/artifacts';

export type PatternKind = 'random' | 'streak' | 'alternate' | 'bias';

/**
 * 出現パターンと見た目の抽選（詳細設計 第5章、D-07）。
 * すべてのパターンを「確率の偏り」として扱い、どの1個も両分類になりうる。
 */
export class Spawner {
  private pattern: PatternKind = 'random';
  private remaining = 0;
  private biasSide: Category = 'haniwa';
  private prev: Category | null = null;
  private prevVariant: Record<Category, string | null> = { haniwa: null, dogu: null };
  private readonly variants: Record<Category, string[]>;
  /** カスタムのとき、はにわの基準の割合（選んだ数の割合。D-48）。4つの難易度では null */
  private readonly customRatio: number | null = null;

  constructor(
    private readonly cfg: GameConfig,
    private readonly rng: Rng,
    private readonly difficulty: PlayMode = 'normal',
    custom?: CustomSettings,
  ) {
    const pick = (cat: Category) => {
      const all = variantsOf(cat).map((v) => v.id);
      if (difficulty !== 'custom' || !custom) return all;
      const set = new Set(custom.variants);
      return all.filter((id) => set.has(id));
    };
    this.variants = { haniwa: pick('haniwa'), dogu: pick('dogu') };
    if (difficulty === 'custom') {
      const h = this.variants.haniwa.length;
      const d = this.variants.dogu.length;
      if (h + d === 0) throw new Error('カスタムで出土品が1つも選ばれていない');
      this.customRatio = h / (h + d);
    }
  }

  get currentPattern(): PatternKind {
    return this.pattern;
  }

  /** 次の1個が「はにわ」になる確率（抽選前に参照できる。テスト用にも公開） */
  probHaniwa(): number {
    const c = this.cfg;
    let p: number;
    const prev = this.prev;
    switch (this.pattern) {
      case 'random':
        p = 0.5;
        break;
      case 'streak':
        p = prev === null ? 0.5 : prev === 'haniwa' ? c.streakSame : 1 - c.streakSame;
        break;
      case 'alternate':
        p = prev === null ? 0.5 : prev === 'haniwa' ? 1 - c.altSwitch : c.altSwitch;
        break;
      case 'bias':
        p = this.biasSide === 'haniwa' ? c.biasRatio : 1 - c.biasRatio;
        break;
    }
    p = Math.min(1 - c.probMin, Math.max(c.probMin, p));
    const r = this.customRatio;
    if (r === null) return p;
    // カスタム：選んだ数の割合 r に合わせてずらす（詳細設計 19.3、R20）。r = 0.5 なら今と同じ
    if (r <= 0) return 0;
    if (r >= 1) return 1;
    return (p * r) / (p * r + (1 - p) * (1 - r));
  }

  private drawPattern(): void {
    const w = this.cfg.patternWeights;
    const total = w.random + w.streak + w.alternate + w.bias;
    let r = this.rng.next() * total;
    const order: PatternKind[] = ['random', 'streak', 'alternate', 'bias'];
    this.pattern = 'random';
    for (const k of order) {
      if (r < w[k]) {
        this.pattern = k;
        break;
      }
      r -= w[k];
    }
    if (this.pattern === 'bias') this.biasSide = this.rng.chance(0.5) ? 'haniwa' : 'dogu';
    this.remaining = this.cfg.patternBlock;
  }

  nextCategory(): Category {
    if (this.remaining <= 0) this.drawPattern();
    const cat: Category = this.rng.chance(this.probHaniwa()) ? 'haniwa' : 'dogu';
    this.remaining--;
    this.prev = cat;
    return cat;
  }

  /** n 番目の出土品で出てよい種類の数（各分類。詳細設計 17.2） */
  variantCount(n: number): number {
    // カスタムは選んだものが最初から全部出て、増えない（D-47）
    if (this.difficulty === 'custom') return Math.max(this.variants.haniwa.length, this.variants.dogu.length);
    return variantCountAt(n, this.difficulty, this.cfg);
  }

  /**
   * 種類：その時点で出てよい種類（一覧の先頭から variantCount 個）から均等に選ぶ。
   * ただし直前と同じ種類は避ける（詳細設計 12章#6・17.2）。n は累計出現数（0始まり）
   */
  nextVariant(cat: Category, n = 0): string {
    const list = this.variants[cat].slice(0, this.variantCount(n));
    const prev = this.prevVariant[cat];
    const pool = list.length > 1 && prev !== null ? list.filter((v) => v !== prev) : list;
    const v = pool[this.rng.int(pool.length)]!;
    this.prevVariant[cat] = v;
    return v;
  }

  /** 見た目：色・大きさ・傾き・反転は両分類で同じ分布（C-32） */
  nextLook(): Look {
    const c = this.cfg;
    return {
      palette: this.rng.int(c.paletteSize),
      scale: this.rng.range(c.lookScale[0], c.lookScale[1]),
      rotDeg: this.rng.range(-c.lookRotDeg, c.lookRotDeg),
      flip: this.rng.chance(c.lookFlip),
    };
  }

  /** テスト用：分類の前回値 */
  get previous(): Category | null {
    return this.prev;
  }
}
