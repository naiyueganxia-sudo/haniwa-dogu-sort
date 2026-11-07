/**
 * 出土品の絵の共通部品。絵はすべて 100×100 の枠の中に描く（中心 50,50）。
 * 色は共通の土色パレットから選ばれ、はにわ・土偶で同じ（C-32）。
 */

export interface Clay {
  base: string;
  light: string;
  dark: string;
  line: string;
  hole: string;
}

const BASES = ['#c98b5e', '#b0673f', '#d9b38c', '#8f6a4f', '#a88f74', '#c4a07a'];

function mix(hex: string, to: number, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (to - c) * amt));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

export const CLAY_PALETTE: Clay[] = BASES.map((b) => ({
  base: b,
  light: mix(b, 255, 0.28),
  dark: mix(b, 0, 0.38),
  line: mix(b, 0, 0.55),
  hole: '#24160e',
}));

export type Ctx = CanvasRenderingContext2D;
export type ArtFn = (c: Ctx, p: Clay) => void;

/** パスを作る関数を受け取り、塗り＋立体感の陰影＋輪郭を描く */
export function body(c: Ctx, p: Clay, path: () => void, outline = true): void {
  c.beginPath();
  path();
  c.fillStyle = p.base;
  c.fill();
  const g = c.createLinearGradient(15, 0, 85, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  c.fillStyle = g;
  c.fill();
  if (outline) {
    c.lineWidth = 1.6;
    c.strokeStyle = p.dark;
    c.lineJoin = 'round';
    c.stroke();
  }
}

export function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  c.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

export function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

export function poly(c: Ctx, pts: number[]): void {
  c.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i]!, pts[i + 1]!);
  c.closePath();
}

/** はにわの特徴：くりぬいた穴 */
export function hole(c: Ctx, p: Clay, x: number, y: number, rx: number, ry: number): void {
  c.beginPath();
  ellipse(c, x, y, rx, ry);
  c.fillStyle = p.hole;
  c.fill();
  c.beginPath();
  c.ellipse(x, y + ry * 0.15, rx, ry, 0, Math.PI * 0.1, Math.PI * 0.9);
  c.strokeStyle = 'rgba(255,255,255,0.18)';
  c.lineWidth = 0.8;
  c.stroke();
}

/** はにわの特徴：突帯（横に巻いた帯） */
export function band(c: Ctx, p: Clay, x1: number, x2: number, y: number): void {
  c.beginPath();
  rrect(c, x1, y - 1.6, x2 - x1, 3.2, 1.6);
  c.fillStyle = p.light;
  c.fill();
  c.strokeStyle = p.dark;
  c.lineWidth = 0.9;
  c.stroke();
}

/** 線の描画 */
export function line(c: Ctx, p: Clay, pts: number[], w = 1.2, color?: string): void {
  c.beginPath();
  c.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i]!, pts[i + 1]!);
  c.strokeStyle = color ?? p.line;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}

/** 土偶の特徴：縄目文（線に沿った短い斜線） */
export function rope(c: Ctx, p: Clay, x1: number, y1: number, x2: number, y2: number, step = 2.6): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const n = Math.max(2, Math.floor(len / step));
  const ux = dx / len;
  const uy = dy / len;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = x1 + (dx * i) / n;
    const y = y1 + (dy * i) / n;
    c.moveTo(x - ux * 1.2 - uy * 1.6, y - uy * 1.2 + ux * 1.6);
    c.lineTo(x + ux * 1.2 + uy * 1.6, y + uy * 1.2 - ux * 1.6);
  }
  c.strokeStyle = p.line;
  c.lineWidth = 0.9;
  c.stroke();
}

/** 土偶の特徴：渦巻き文 */
export function spiral(c: Ctx, p: Clay, x: number, y: number, r: number, turns = 2): void {
  c.beginPath();
  const steps = 40 * turns;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * turns * Math.PI * 2;
    const rr = (r * i) / steps;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.strokeStyle = p.line;
  c.lineWidth = 1.1;
  c.stroke();
}

/** 土偶の特徴：刺突文（点の並び） */
export function dots(c: Ctx, p: Clay, pts: number[], r = 0.9): void {
  c.fillStyle = p.line;
  for (let i = 0; i < pts.length; i += 2) {
    c.beginPath();
    c.arc(pts[i]!, pts[i + 1]!, r, 0, Math.PI * 2);
    c.fill();
  }
}

/** 浮き彫りの線（土偶の目・眉など） */
export function relief(c: Ctx, p: Clay, path: () => void, w = 1.4): void {
  c.beginPath();
  path();
  c.strokeStyle = p.line;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.stroke();
}
