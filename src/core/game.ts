import { DEFAULT_CONFIG, derive, type Derived, type GameConfig } from './config';
import { spacingFor, speedFor } from './difficulty';
import { Rng } from './rng';
import { isMilestone, multiplierFor } from './scoring';
import { Spawner } from './spawner';
import type { GameEvent, Item, PressResult, Side, Stats, Zone } from './types';
import { SIDE_OF } from './types';
import { zoneOf } from './zones';

/**
 * ゲーム本体（詳細設計 第2・3章）。DOM・Canvasに依存しない。
 * 時刻（秒）を受け取り、出来事（出現・判定ライン通過）の時刻を正確に計算して進める。
 * 同じ種・同じ入力なら、どんな刻みで進めても同じ結果になる。
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
  private nextId = 1;

  constructor(seed: number, cfg: GameConfig = DEFAULT_CONFIG) {
    this.cfg = cfg;
    this.d = derive(cfg);
    this.spawner = new Spawner(cfg, new Rng(seed));
    this.speed = speedFor(0, cfg, this.d.baseSpeed);
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
      const tSpawn = this.time + Math.max(0, this.nextSpawnD - this.D) / this.speed;
      const f = this.items[0];
      const tPass = f ? this.time + Math.max(0, this.cfg.judgeY - this.yOf(f)) / this.speed : Infinity;
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
    this.D += (t - this.time) * this.speed;
    this.time = t;
  }

  private spawn(): void {
    const n = this.spawnedCount;
    const cfg = this.cfg;
    const category = this.spawner.nextCategory();
    const item: Item = {
      id: this.nextId++,
      category,
      variantId: this.spawner.nextVariant(category),
      look: this.spawner.nextLook(),
      spawnD: this.nextSpawnD,
    };
    // 浮動小数の誤差で D がわずかに手前でも、位置は出現位置ちょうどとする
    this.D = Math.max(this.D, this.nextSpawnD);
    this.items.push(item);
    this.spawnedCount++;
    this.speed = speedFor(n, cfg, this.d.baseSpeed);
    this.nextSpawnD = item.spawnD + spacingFor(n, cfg, this.d.baseSpeed);
    this.events.push({ type: 'spawn', t: this.time, item });
  }

  private passFront(): void {
    const item = this.items.shift()!;
    this.D = Math.max(this.D, item.spawnD + this.cfg.judgeY - this.cfg.spawnY);
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
    if (SIDE_OF[item.category] === side) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const mult = multiplierFor(this.combo, this.cfg);
      const points = Math.round(this.cfg.basePoints * mult);
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
