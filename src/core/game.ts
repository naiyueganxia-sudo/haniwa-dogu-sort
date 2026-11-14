import { DEFAULT_CONFIG, DIFFICULTIES, DIFFICULTY_ORDER, derive, type Derived, type GameConfig, type PlayMode } from './config';
import type { CustomSettings } from './custom';
import { spacingFor, speedFor } from './difficulty';
import { Rng } from './rng';
import { isMilestone, multiplierFor, pointsFor } from './scoring';
import { Spawner } from './spawner';
import type { GameEvent, Item, PressResult, Side, Stats, Zone } from './types';
import { SIDE_OF } from './types';
import { zoneOf } from './zones';

/**
 * 乱数の種を難易度で混ぜる（詳細設計 17.4、R13）。
 * 同じ整理券でも難易度が違えば出土品の並びが変わり、難易度を偽った操作記録は再計算で合わなくなる。
 */
export function mixSeed(seed: number, difficulty: PlayMode): number {
  // カスタムは5（今の4つの番号は変えない。詳細設計 19.3）
  const k = difficulty === 'custom' ? 5 : DIFFICULTY_ORDER.indexOf(difficulty) + 1;
  let h = (seed ^ Math.imul(k, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * ゲーム本体（詳細設計 第2・3章）。DOM・Canvasに依存しない。
 * 時刻（秒）を受け取り、出来事（出現・判定ライン通過）の時刻を正確に計算して進める。
 * 同じ種・同じ入力なら、どんな刻みで進めても同じ結果になる。
 * 位置は「直前の出来事の時刻と位置（基準）」からの経過で毎回計算するため、
 * 途中を何回に分けて進めても、小数の丸めまで含めて完全に一致する（詳細設計 16.2）。
 */
export class Game {
  readonly cfg: GameConfig;
  readonly d: Derived;
  private readonly spawner: Spawner;
  private events: GameEvent[] = [];

  time = 0;
  /** コンベアの累計移動距離 */
  D = 0;
  speed: number;
  /** コンベア上の出土品（出現順。先頭 = items[0]） */
  items: Item[] = [];
  spawnedCount = 0;
  nextSpawnD = 0;
  score = 0;
  combo = 0;
  maxCombo = 0;
  correct = 0;
  wrong = 0;
  passed = 0;
  misses = 0;
  status: 'playing' | 'over' = 'playing';
  overTime = 0;
  /** 判定された入力（正解・不正解）の記録。サーバーでの再計算に使う（詳細設計 16.3） */
  readonly pressLog: { t: number; side: Side }[] = [];
  private nextId = 1;
  /** 基準（直前の出来事）の時刻と累計移動距離 */
  private segT = 0;
  private segD = 0;

  readonly difficulty: PlayMode;
  /** カスタムの設定（4つの難易度では null） */
  readonly custom: CustomSettings | null;
  private readonly speedMult: number;
  private readonly scoreMult: number;

  constructor(seed: number, difficulty: PlayMode = 'normal', cfg: GameConfig = DEFAULT_CONFIG, custom?: CustomSettings) {
    if (difficulty === 'custom' && !custom) throw new Error('カスタムには設定が必要');
    this.cfg = cfg;
    this.d = derive(cfg);
    this.difficulty = difficulty;
    this.custom = difficulty === 'custom' ? custom! : null;
    this.speedMult = this.custom ? this.custom.speed : 1;
    this.scoreMult = difficulty === 'custom' ? 1 : DIFFICULTIES[difficulty].scoreMult;
    this.spawner = new Spawner(cfg, new Rng(mixSeed(seed, difficulty)), difficulty, this.custom ?? undefined);
    this.speed = this.speedAt(0);
  }

  /**
   * n 番目の出土品のときの速さ。カスタムでは設定の倍率をかけ、速度アップ OFF なら最初の速さのまま（詳細設計 19.3）。
   * 4つの難易度では倍率1で、今までと同じ値になる。
   */
  private speedAt(n: number): number {
    return speedFor(this.rampN(n), this.cfg, this.d.baseSpeed) * this.speedMult;
  }

  /** 速度アップ OFF のカスタムでは、速さと間隔の計算で「何個目か」を常に0とみなす */
  private rampN(n: number): number {
    return this.custom && !this.custom.speedUp ? 0 : n;
  }

  /** 出土品の中心 y */
  yOf(item: Item): number {
    return this.cfg.spawnY + (this.D - item.spawnD);
  }

  zoneOfItem(item: Item): Zone {
    return zoneOf(this.yOf(item), this.cfg, this.d);
  }

  get front(): Item | undefined {
    return this.items[0];
  }

  get pattern(): string {
    return this.spawner.currentPattern;
  }

  /** 時刻 t まで進める（t が現在より前なら何もしない） */
  advanceTo(t: number): void {
    while (this.status === 'playing' && t > this.time) {
      const tSpawn = this.segT + Math.max(0, this.nextSpawnD - this.segD) / this.speed;
      const f = this.items[0];
      const tPass = f
        ? this.segT + Math.max(0, this.cfg.judgeY - (this.cfg.spawnY + this.segD - f.spawnD)) / this.speed
        : Infinity;
      const tNext = Math.min(tSpawn, tPass);
      if (tNext > t) {
        this.moveTo(t);
        break;
      }
      this.moveTo(tNext);
      if (tPass <= tSpawn) this.passFront();
      else this.spawn();
    }
  }

  private moveTo(t: number): void {
    this.D = this.segD + (t - this.segT) * this.speed;
    this.time = t;
  }

  /** 出来事が起きたら、その時刻と位置を新しい基準にする */
  private anchor(): void {
    this.segT = this.time;
    this.segD = this.D;
  }

  private spawn(): void {
    const n = this.spawnedCount;
    const cfg = this.cfg;
    const category = this.spawner.nextCategory();
    const item: Item = {
      id: this.nextId++,
      category,
      variantId: this.spawner.nextVariant(category, n),
      look: this.spawner.nextLook(),
      spawnD: this.nextSpawnD,
    };
    // 浮動小数の誤差で D がわずかに手前でも、位置は出現位置ちょうどとする
    this.D = Math.max(this.D, this.nextSpawnD);
    this.items.push(item);
    this.spawnedCount++;
    this.speed = this.speedAt(n);
    this.nextSpawnD = item.spawnD + spacingFor(this.rampN(n), cfg, this.d.baseSpeed);
    this.anchor();
    this.events.push({ type: 'spawn', t: this.time, item });
    if (n > 0 && this.spawner.variantCount(n) > this.spawner.variantCount(n - 1)) {
      this.events.push({ type: 'unlock', t: this.time, count: this.spawner.variantCount(n) });
    }
  }

  private passFront(): void {
    const item = this.items.shift()!;
    this.D = Math.max(this.D, item.spawnD + this.cfg.judgeY - this.cfg.spawnY);
    this.anchor();
    this.passed++;
    this.combo = 0;
    this.events.push({ type: 'passed', t: this.time, item });
    this.addMiss();
  }

  private addMiss(): void {
    this.misses++;
    if (this.misses >= this.cfg.maxMisses) {
      this.status = 'over';
      this.overTime = this.time;
      this.events.push({ type: 'gameover', t: this.time });
    }
  }

  /** 左右の押下（詳細設計 3.2）。t はゲーム時刻。 */
  press(side: Side, t: number): PressResult {
    this.advanceTo(t);
    if (this.status === 'over') return 'ignored-over';
    const item = this.items[0];
    if (!item) return 'ignored-empty';
    const y = this.yOf(item);
    const zone = zoneOf(y, this.cfg, this.d);
    if (zone === 'waiting') return 'ignored-waiting';
    // zone が 'passed' になることはない（advanceTo で処理済み）
    this.items.shift();
    // 判定に使った時刻（入力の時刻が直前のフレームより前なら、今の時刻）を記録
    this.pressLog.push({ t: this.time, side });
    if (SIDE_OF[item.category] === side) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const mult = multiplierFor(this.combo, this.cfg);
      const points = pointsFor(this.combo, this.cfg, this.scoreMult);
      this.score += points;
      this.correct++;
      this.events.push({ type: 'correct', t: this.time, item, y, side, points, mult, combo: this.combo });
      if (isMilestone(this.combo, this.cfg)) {
        this.events.push({ type: 'milestone', t: this.time, combo: this.combo, mult });
      }
      return 'correct';
    }
    this.wrong++;
    this.combo = 0;
    this.events.push({ type: 'wrong', t: this.time, item, y, side });
    this.addMiss();
    return 'wrong';
  }

  /** たまったイベントを取り出す */
  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  get multiplier(): number {
    return multiplierFor(this.combo, this.cfg);
  }

  stats(): Stats {
    const judged = this.correct + this.wrong + this.passed;
    return {
      score: this.score,
      correct: this.correct,
      sorted: this.correct + this.wrong,
      misses: this.misses,
      wrong: this.wrong,
      passed: this.passed,
      maxCombo: this.maxCombo,
      accuracy: judged === 0 ? null : this.correct / judged,
      playTimeSec: this.status === 'over' ? this.overTime : this.time,
    };
  }
}
