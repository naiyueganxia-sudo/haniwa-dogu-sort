import { Sfx } from '../audio/sfx';
import { DEFAULT_CONFIG, type GameConfig } from '../core/config';
import { interpolate } from '../core/difficulty';
import { Game } from '../core/game';
import { InputArbiter } from '../core/inputArbiter';
import { randomSeed } from '../core/rng';
import type { GameEvent, Side } from '../core/types';
import { bindKeyboard } from '../input/keyboard';
import { bindTouch, releaseAllButtons } from '../input/touch';
import { Effects } from '../render/effects';
import { Renderer } from '../render/renderer';
import { Hud } from '../ui/hud';
import { Screens } from '../ui/screens';
import { GameClock } from './clock';
import { computeLayout, decideMode, type Layout, type Mode } from './layout';
import { load, save, type SaveData } from './storage';

type Scene = 'title' | 'howto' | 'playing' | 'paused' | 'ending' | 'result';

const COLOR_GOOD = '#f4d27a';
const COLOR_BAD = '#ff6b62';

/** 画面遷移とループ（詳細設計 第1・6・7章） */
export class App {
  private cfg: GameConfig = DEFAULT_CONFIG;
  private game: Game | null = null;
  private clock = new GameClock(this.cfg.maxFrameAdvanceSec);
  private arbiter = new InputArbiter(this.cfg.simulWindowSec);
  private renderer: Renderer;
  private fx = new Effects();
  private hud = new Hud();
  private screens: Screens;
  private sfx = new Sfx();
  private data: SaveData = load();
  private scene: Scene = 'title';
  private howtoReturn: Scene = 'title';
  private mode: Mode = 'desktop';
  private touchSeen = false;
  private layout!: Layout;
  private debug: boolean;
  private seedParam: number | null;
  private retryLockUntil = 0;
  private endingTimer = 0;
  private lowQuality = false;
  private frameTimes: number[] = [];
  private debugEl = document.getElementById('debug')!;
  private btn: Record<Side, HTMLElement> = {
    L: document.getElementById('btn-L')!,
    R: document.getElementById('btn-R')!,
  };

  constructor() {
    const q = new URLSearchParams(location.search);
    this.debug = q.get('debug') === '1';
    const seed = q.get('seed');
    this.seedParam = seed !== null && /^\d+$/.test(seed) ? Number(seed) : null;
    this.debugEl.hidden = !this.debug;
    if (this.debug) (window as unknown as { __game: () => Game | null; __scene: () => Scene }).__game = () => this.game;
    if (this.debug) (window as unknown as { __scene: () => Scene }).__scene = () => this.scene;

    this.renderer = new Renderer(document.getElementById('game') as HTMLCanvasElement);
    this.screens = new Screens((act) => this.action(act));
    this.sfx.muted = this.data.muted;
    this.screens.setMuted(this.data.muted);
    this.screens.setBest(this.data.bestScore);

    bindKeyboard({
      sortDown: (s, side, ms) => this.sortDown(s, side, ms),
      sortUp: (s) => this.arbiter.up(s),
      command: (code) => this.command(code),
    });
    bindTouch({
      sortDown: (s, side, ms) => this.sortDown(s, side, ms),
      sortUp: (s) => this.arbiter.up(s),
      touchSeen: () => {
        if (!this.touchSeen) {
          this.touchSeen = true;
          this.relayout();
        }
      },
    });
    document.getElementById('btn-pause')!.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      if (this.scene === 'playing') this.pause();
    });

    // 自動一時停止（D-09）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
    });
    window.addEventListener('blur', () => this.autoPause());
    window.addEventListener('pagehide', () => this.autoPause());
    window.addEventListener('resize', () => this.relayout());
    window.visualViewport?.addEventListener('resize', () => this.relayout());

    this.relayout();
    this.screens.show('title');
    requestAnimationFrame((t) => this.frame(t));
  }

  // ===== 配置 =====
  private relayout(): void {
    const touch = this.touchSeen || window.matchMedia('(pointer: coarse)').matches;
    const mode = decideMode(touch, window.innerWidth, window.innerHeight);
    const changed = mode !== this.mode;
    // スマホで向きが変わったら一時停止（PCの大きさ変更では止めない）
    if (changed && this.scene === 'playing' && this.mode !== 'desktop' && mode !== 'desktop') this.pause();
    this.mode = mode;
    document.body.classList.remove('mode-portrait', 'mode-landscape', 'mode-desktop');
    document.body.classList.add(`mode-${mode}`);
    this.layout = computeLayout(mode, this.cfg);
    this.renderer.dprMax = this.lowQuality ? 1.5 : 2;
    this.renderer.resize(this.layout, this.cfg.itemSize, this.cfg.lookScale[1]);
  }

  // ===== 入力 =====
  private sortDown(source: string, side: Side, ms: number): void {
    if (this.scene !== 'playing' || !this.game) return;
    const t = this.clock.timeAt(ms);
    if (!this.arbiter.down(source, side, t)) return;
    this.game.press(side, t);
    this.handleEvents(this.game.drainEvents());
  }

  private command(code: string): void {
    const s = this.scene;
    if (code === 'Space') {
      if (s === 'title') this.start();
      else if (s === 'playing') this.pause();
      else if (s === 'paused') this.resume();
    } else if (code === 'Escape') {
      if (s === 'playing') this.pause();
      else if (s === 'paused') this.resume();
      else if (s === 'howto') this.action('back');
    } else if (code === 'Enter') {
      if (s === 'title') this.start();
      else if (s === 'result') this.tryRetry();
    } else if (code === 'KeyR') {
      if (s === 'result') this.tryRetry();
    }
  }

  private action(act: string): void {
    this.sfx.unlock();
    switch (act) {
      case 'start':
        this.start();
        break;
      case 'retry':
        if (this.scene === 'result') this.tryRetry();
        else this.start();
        break;
      case 'resume':
        this.resume();
        break;
      case 'title':
        this.toTitle();
        break;
      case 'howto':
        this.howtoReturn = this.scene === 'paused' ? 'paused' : 'title';
        this.scene = 'howto';
        this.screens.show('howto');
        break;
      case 'back':
        this.scene = this.howtoReturn;
        this.screens.show(this.howtoReturn === 'paused' ? 'pause' : 'title');
        break;
      case 'mute':
        this.data.muted = !this.data.muted;
        this.sfx.muted = this.data.muted;
        this.screens.setMuted(this.data.muted);
        save(this.data);
        break;
    }
  }

  // ===== 進行 =====
  private start(): void {
    this.sfx.unlock();
    clearTimeout(this.endingTimer);
    this.game = new Game(this.seedParam ?? randomSeed(), this.cfg);
    this.clock.start(performance.now());
    this.arbiter.reset();
    this.fx.clear();
    this.hud.reset();
    this.frameTimes.length = 0;
    if (this.lowQuality) {
      this.lowQuality = false;
      this.fx.maxParticles = 64;
      this.relayout();
    }
    this.scene = 'playing';
    this.screens.show(null);
  }

  private pause(): void {
    if (this.scene !== 'playing') return;
    this.clock.pause();
    this.arbiter.reset();
    releaseAllButtons();
    this.scene = 'paused';
    this.screens.show('pause');
  }

  private autoPause(): void {
    this.arbiter.reset();
    releaseAllButtons();
    if (this.scene === 'playing') this.pause();
  }

  private resume(): void {
    if (this.scene !== 'paused') return;
    this.scene = 'playing';
    this.screens.show(null);
    this.clock.resume(performance.now());
  }

  private toTitle(): void {
    clearTimeout(this.endingTimer);
    this.clock.pause();
    this.game = null;
    this.fx.clear();
    this.scene = 'title';
    this.screens.setBest(this.data.bestScore);
    this.screens.show('title');
  }

  private tryRetry(): void {
    if (performance.now() < this.retryLockUntil) return;
    this.start();
  }

  private gameOver(): void {
    this.scene = 'ending';
    this.clock.pause();
    this.arbiter.reset();
    releaseAllButtons();
    this.screens.show('ending');
    this.sfx.gameover();
    this.endingTimer = window.setTimeout(() => this.showResult(), this.cfg.gameoverAnimSec * 1000);
  }

  private showResult(): void {
    if (!this.game) return;
    const s = this.game.stats();
    const isNew = s.score > this.data.bestScore;
    if (isNew) {
      this.data.bestScore = s.score;
      save(this.data);
    }
    this.screens.fillResult(s, this.data.bestScore, isNew);
    this.scene = 'result';
    this.screens.show('result');
    this.retryLockUntil = performance.now() + this.cfg.retryLockSec * 1000;
    this.screens.setRetryEnabled(false);
    window.setTimeout(() => this.screens.setRetryEnabled(true), this.cfg.retryLockSec * 1000);
  }

  // ===== イベント → 演出・音 =====
  private handleEvents(events: GameEvent[]): void {
    const game = this.game;
    if (!game) return;
    const now = performance.now() / 1000;
    const r = this.renderer;
    const s = this.layout.scale;
    for (const e of events) {
      switch (e.type) {
        case 'correct': {
          this.fx.flyers.push({ item: e.item, x0: this.layout.beltX, y0: r.sy(e.y), side: e.side, wrong: false, t0: now, dur: 0.25, arrived: false });
          const b = r.boxCenter(e.side);
          this.fx.popups.push({ text: `+${e.points}`, x: b.x, y: b.y - 40 * s - 20, color: COLOR_GOOD, t0: now, dur: 0.5, size: e.mult > 1 ? 24 : 20 });
          this.sfx.correct(e.mult);
          this.hud.bump();
          break;
        }
        case 'wrong': {
          this.fx.flyers.push({ item: e.item, x0: this.layout.beltX, y0: r.sy(e.y), side: e.side, wrong: true, t0: now, dur: 0.3, arrived: false });
          const b = r.boxCenter(e.side);
          this.fx.popups.push({ text: 'ちがう！', x: b.x, y: b.y - 40 * s - 20, color: COLOR_BAD, t0: now, dur: 0.6, size: 22 });
          this.fx.flashes.push({ side: e.side, good: false, t0: now });
          this.flashButton(e.side, 'flash-bad');
          this.sfx.wrong();
          break;
        }
        case 'passed': {
          const y = r.sy(game.cfg.judgeY);
          this.fx.fallers.push({ item: e.item, x: this.layout.beltX, y0: y, t0: now, dur: 0.4 });
          this.fx.popups.push({ text: '見逃し', x: this.layout.beltX, y: y + 10, color: COLOR_BAD, t0: now, dur: 0.7, size: 20 });
          this.sfx.passed();
          break;
        }
        case 'milestone':
          this.hud.milestone(e.combo, e.mult);
          this.sfx.milestone();
          break;
        case 'gameover':
          this.gameOver();
          break;
        case 'spawn':
          break;
      }
    }
  }

  private flashButton(side: Side, cls: string): void {
    if (this.layout.drawBoxes) return;
    const el = this.btn[side];
    el.classList.remove('flash-good', 'flash-bad');
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // ===== ループ =====
  private frame(_tMs: number): void {
    const nowMs = performance.now();
    const now = nowMs / 1000;
    const game = this.game;
    if (this.scene === 'playing' && game) {
      const t = this.clock.tick(nowMs);
      game.advanceTo(t);
      this.handleEvents(game.drainEvents());
      this.monitorQuality(nowMs);
    }
    // 飛んだ出土品が箱に着いたとき
    for (const f of this.fx.flyers) {
      if (!f.arrived && now - f.t0 >= f.dur) {
        f.arrived = true;
        if (!f.wrong) {
          const b = this.renderer.boxCenter(f.side);
          this.fx.burst(b.x, b.y, COLOR_GOOD, this.lowQuality ? 5 : 10, now);
          this.fx.flashes.push({ side: f.side, good: true, t0: now });
          this.flashButton(f.side, 'flash-good');
        }
      }
    }
    this.fx.prune(now);
    this.renderer.draw(game, this.fx, { hideItems: this.scene === 'paused', debug: this.debug, now });
    if (game) this.hud.update(game.score, game.combo, game.multiplier, game.misses);
    else this.hud.update(0, 0, 1, 0);
    if (this.debug) this.drawDebug(nowMs);
    requestAnimationFrame((t) => this.frame(t));
  }

  /** 描画負荷の調整（詳細設計 8.3）：直近3秒の平均が20msを超えたら低画質へ */
  private monitorQuality(nowMs: number): void {
    if (this.lowQuality) return;
    this.frameTimes.push(nowMs);
    while (this.frameTimes.length && nowMs - this.frameTimes[0]! > 3000) this.frameTimes.shift();
    if (this.frameTimes.length > 30 && nowMs - this.frameTimes[0]! > 2500) {
      const avg = (nowMs - this.frameTimes[0]!) / (this.frameTimes.length - 1);
      if (avg > 20) {
        this.lowQuality = true;
        this.fx.maxParticles = 24;
        this.relayout();
      }
    }
  }

  private drawDebug(nowMs: number): void {
    const g = this.game;
    const fps = this.frameTimes.length > 1 ? ((this.frameTimes.length - 1) * 1000) / (nowMs - this.frameTimes[0]!) : 0;
    const n = g?.spawnedCount ?? 0;
    this.debugEl.textContent = [
      `mode ${this.mode}  scale ${this.layout.scale.toFixed(3)}  item ${(this.cfg.itemSize * this.layout.scale).toFixed(0)}px`,
      `fps ${fps.toFixed(0)}  quality ${this.lowQuality ? 'low' : 'high'}`,
      g
        ? `t ${g.time.toFixed(2)}  n ${n}  speed x${interpolate(this.cfg.speedPoints, Math.max(0, n - 1)).toFixed(2)}  interval ${interpolate(this.cfg.intervalPoints, Math.max(0, n - 1)).toFixed(2)}s  pattern ${g.pattern}`
        : 'no game',
    ].join('\n');
  }
}
