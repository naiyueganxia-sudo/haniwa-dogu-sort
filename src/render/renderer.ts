import type { Game } from '../core/game';
import type { Item, Side } from '../core/types';
import type { Layout, Rect } from '../app/layout';
import { SpriteCache } from './art';
import type { Effects } from './effects';

export interface RenderOptions {
  hideItems: boolean;
  debug: boolean;
  now: number;
}

const COLOR = {
  bg0: '#241b15',
  bg1: '#15100c',
  belt: '#3b3029',
  roller: 'rgba(0,0,0,0.28)',
  rollerHi: 'rgba(255,255,255,0.05)',
  rail: '#5a4a3c',
  frame: '#e8b85a',
  line: '#e8b85a',
  haniwa: '#c26a3c',
  dogu: '#4f8781',
  good: '#7ccf6a',
  bad: '#e5534b',
};

/** Canvas 2D の描画（詳細設計 8.1）。ロジックの状態を読むだけで変更しない。 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private sprites = new SpriteCache();
  private dpr = 1;
  dprMax = 2;
  private L!: Layout;
  private itemSize = 170;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  resize(layout: Layout, itemSize: number, maxLookScale: number): void {
    this.L = layout;
    this.itemSize = itemSize;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprMax);
    this.canvas.width = Math.round(layout.vw * this.dpr);
    this.canvas.height = Math.round(layout.vh * this.dpr);
    this.sprites.setSize(itemSize * maxLookScale * layout.scale * this.dpr);
  }

  get layout(): Layout {
    return this.L;
  }

  /** 論理座標 y → 画面 y */
  sy(y: number): number {
    return this.L.beltTop + y * this.L.scale;
  }

  boxCenter(side: Side): { x: number; y: number } {
    const r = side === 'L' ? this.L.boxL : this.L.boxR;
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  draw(game: Game | null, fx: Effects, o: RenderOptions): void {
    const c = this.ctx;
    const L = this.L;
    const cfg = game?.cfg;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 背景
    const g = c.createLinearGradient(0, 0, 0, L.vh);
    g.addColorStop(0, COLOR.bg0);
    g.addColorStop(1, COLOR.bg1);
    c.fillStyle = g;
    c.fillRect(0, 0, L.vw, L.vh);

    if (!game || !cfg) return;
    const s = L.scale;
    const halfW = (cfg.beltWidth / 2) * s;
    const st = L.stage;

    // コンベア（ステージ内に切り抜き）
    c.save();
    c.beginPath();
    c.rect(st.x - 40, st.y, st.w + 80, st.h);
    c.clip();

    c.fillStyle = COLOR.belt;
    c.fillRect(L.beltX - halfW, st.y, halfW * 2, st.h);
    // ローラー（コンベアの移動に合わせて流れる）
    const pitch = 48;
    const off = ((game.D % pitch) + pitch) % pitch;
    for (let y = off - pitch; y < cfg.viewBottom + pitch; y += pitch) {
      const py = this.sy(y);
      c.fillStyle = COLOR.roller;
      c.fillRect(L.beltX - halfW, py, halfW * 2, 3);
      c.fillStyle = COLOR.rollerHi;
      c.fillRect(L.beltX - halfW, py + 3, halfW * 2, 2);
    }
    // レール
    c.fillStyle = COLOR.rail;
    c.fillRect(L.beltX - halfW - 8, st.y, 8, st.h);
    c.fillRect(L.beltX + halfW, st.y, 8, st.h);

    // 判定ラインより下（見逃し側）
    const jy = this.sy(cfg.judgeY);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(L.beltX - halfW, jy, halfW * 2, st.y + st.h - jy);

    // 判定枠（通常判定エリアのみ。D-03）
    const ny = this.sy(game.d.normalStart);
    c.fillStyle = 'rgba(232,184,90,0.10)';
    c.fillRect(L.beltX - halfW - 10, ny, halfW * 2 + 20, jy - ny);
    c.strokeStyle = 'rgba(232,184,90,0.75)';
    c.lineWidth = 2;
    c.strokeRect(L.beltX - halfW - 10, ny, halfW * 2 + 20, jy - ny);
    // 判定ライン
    c.fillStyle = COLOR.line;
    c.fillRect(L.beltX - halfW - 18, jy - 2, halfW * 2 + 36, 4);

    if (o.debug) {
      const ey = this.sy(game.d.earlyStart);
      c.setLineDash([6, 4]);
      c.strokeStyle = '#6cf';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(L.beltX - halfW - 30, ey);
      c.lineTo(L.beltX + halfW + 30, ey);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#6cf';
      c.font = '11px monospace';
      c.fillText('early', L.beltX + halfW + 12, ey - 3);
      c.fillText('normal', L.beltX + halfW + 12, ny - 3);
    }

    // 出土品
    if (!o.hideItems) {
      for (const it of game.items) this.drawItem(it, L.beltX, this.sy(game.yOf(it)), 1, 0);
    }
    // 見逃して落ちる出土品
    for (const f of fx.fallers) {
      const k = Math.min(1, (o.now - f.t0) / f.dur);
      c.globalAlpha = 1 - k;
      this.drawItem(f.item, f.x, f.y0 + k * k * 90 * s * 3, 1 - 0.2 * k, 0);
      c.globalAlpha = 1;
    }
    c.restore();

    // 回収箱（PC）
    if (L.drawBoxes) {
      this.drawBox(L.boxL, 'L', fx, o.now);
      this.drawBox(L.boxR, 'R', fx, o.now);
    }

    // 飛んでいく出土品
    for (const f of fx.flyers) {
      const k = Math.min(1, (o.now - f.t0) / f.dur);
      const e = 1 - (1 - k) * (1 - k);
      const to = this.boxCenter(f.side);
      const cx = (f.x0 + to.x) / 2;
      const cy = Math.min(f.y0, to.y) - 70 * s * 2;
      const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * cx + e * e * to.x;
      const y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * cy + e * e * to.y;
      const sc = 1 - 0.4 * e;
      c.globalAlpha = k >= 1 ? 0 : 1;
      this.drawItem(f.item, x, y, sc, (f.side === 'L' ? -1 : 1) * e * 0.9);
      if (f.wrong) this.drawCross(x, y, cfg.itemSize * s * 0.45 * sc);
      c.globalAlpha = 1;
    }

    // 粒
    for (const p of fx.particles) {
      const t = o.now - p.t0;
      const k = t / p.dur;
      c.globalAlpha = Math.max(0, 1 - k);
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x + p.vx * t, p.y + p.vy * t + 300 * t * t, p.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // 得点などの文字
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const p of fx.popups) {
      const k = (o.now - p.t0) / p.dur;
      c.globalAlpha = Math.max(0, 1 - k * k);
      c.font = `800 ${p.size}px system-ui, sans-serif`;
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(0,0,0,0.6)';
      const y = p.y - k * 28;
      c.strokeText(p.text, p.x, y);
      c.fillStyle = p.color;
      c.fillText(p.text, p.x, y);
    }
    c.globalAlpha = 1;
    c.textAlign = 'start';
    c.textBaseline = 'alphabetic';
  }

  private drawItem(it: Item, x: number, y: number, extraScale: number, extraRot: number): void {
    const c = this.ctx;
    const size = this.itemSize * this.L.scale * it.look.scale * extraScale;
    const img = this.sprites.get(it.variantId, it.look.palette);
    c.save();
    c.translate(x, y);
    c.rotate((it.look.rotDeg * Math.PI) / 180 + extraRot);
    if (it.look.flip) c.scale(-1, 1);
    // 影
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(0, size * 0.46, size * 0.36, size * 0.07, 0, 0, Math.PI * 2);
    c.fill();
    c.drawImage(img, -size / 2, -size / 2, size, size);
    c.restore();
  }

  private drawCross(x: number, y: number, r: number): void {
    const c = this.ctx;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = Math.max(6, r * 0.32);
    this.crossPath(x, y, r);
    c.stroke();
    c.strokeStyle = COLOR.bad;
    c.lineWidth = Math.max(4, r * 0.22);
    this.crossPath(x, y, r);
    c.stroke();
    c.restore();
  }

  private crossPath(x: number, y: number, r: number): void {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x - r, y - r);
    c.lineTo(x + r, y + r);
    c.moveTo(x + r, y - r);
    c.lineTo(x - r, y + r);
  }

  private drawBox(r: Rect, side: Side, fx: Effects, now: number): void {
    const c = this.ctx;
    const flash = fx.flashes.filter((f) => f.side === side).pop();
    const fk = flash ? 1 - (now - flash.t0) / 0.3 : 0;
    c.save();
    const base = side === 'L' ? COLOR.haniwa : COLOR.dogu;
    c.fillStyle = base;
    c.globalAlpha = 0.9;
    roundRect(c, r.x, r.y, r.w, r.h, 14);
    c.fill();
    c.globalAlpha = 1;
    // 箱の口（暗い部分）
    c.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(c, r.x + r.w * 0.1, r.y + r.h * 0.12, r.w * 0.8, r.h * 0.3, 8);
    c.fill();
    if (fk > 0 && flash) {
      c.strokeStyle = flash.good ? COLOR.good : COLOR.bad;
      c.globalAlpha = fk;
      c.lineWidth = 6;
      roundRect(c, r.x, r.y, r.w, r.h, 14);
      c.stroke();
      c.globalAlpha = 1;
    }
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = `800 ${Math.max(14, r.h * 0.2)}px system-ui, sans-serif`;
    c.fillText(side === 'L' ? 'はにわ' : '土偶', r.x + r.w / 2, r.y + r.h * 0.68);
    c.font = `600 ${Math.max(11, r.h * 0.12)}px system-ui, sans-serif`;
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillText(side === 'L' ? 'A / ←' : 'D / →', r.x + r.w / 2, r.y + r.h * 0.88);
    c.restore();
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
