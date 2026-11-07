import type { GameConfig } from '../core/config';

export type Mode = 'portrait' | 'landscape' | 'desktop';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  mode: Mode;
  vw: number;
  vh: number;
  stage: Rect;
  /** 論理座標1あたりのCSSピクセル */
  scale: number;
  /** コンベア中心のx（CSS px） */
  beltX: number;
  /** 論理座標 y=0 のCSS y */
  beltTop: number;
  boxL: Rect;
  boxR: Rect;
  /** 回収箱をCanvasに描くか（PC配置） */
  drawBoxes: boolean;
}

/** PC配置で回収箱に使う論理サイズ */
export const DESK_BOX = { w: 230, h: 170, gap: 50, cy: 880 };

export function decideMode(touch: boolean, vw: number, vh: number): Mode {
  if (!touch) return 'desktop';
  return vh >= vw ? 'portrait' : 'landscape';
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** CSSで配置されたDOMの位置から、コンベアの描画位置を求める（詳細設計 第7章） */
export function computeLayout(mode: Mode, cfg: GameConfig): Layout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const stage = rectOf(document.getElementById('stage')!);
  const needW = mode === 'desktop' ? cfg.beltWidth + 2 * (DESK_BOX.gap + DESK_BOX.w) + 40 : cfg.beltWidth + 30;
  const scale = Math.max(0.05, Math.min(stage.h / cfg.viewBottom, stage.w / needW));
  const beltX = stage.x + stage.w / 2;
  const beltTop = stage.y + stage.h - cfg.viewBottom * scale;
  let boxL: Rect;
  let boxR: Rect;
  if (mode === 'desktop') {
    const w = DESK_BOX.w * scale;
    const h = DESK_BOX.h * scale;
    const off = (cfg.beltWidth / 2 + DESK_BOX.gap) * scale;
    const y = beltTop + DESK_BOX.cy * scale - h / 2;
    boxL = { x: beltX - off - w, y, w, h };
    boxR = { x: beltX + off, y, w, h };
  } else {
    boxL = rectOf(document.getElementById('btn-L')!);
    boxR = rectOf(document.getElementById('btn-R')!);
  }
  return { mode, vw, vh, stage, scale, beltX, beltTop, boxL, boxR, drawBoxes: mode === 'desktop' };
}
