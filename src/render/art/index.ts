import { CLAY_PALETTE, type ArtFn } from './common';
import { DOGU_ART } from './dogu';
import { DOGU_ART_2 } from './dogu2';
import { HANIWA_ART } from './haniwa';
import { HANIWA_ART_2 } from './haniwa2';

export const ART: Record<string, ArtFn> = { ...HANIWA_ART, ...HANIWA_ART_2, ...DOGU_ART, ...DOGU_ART_2 };

/** 100×100 の絵を、size ピクセル四方のキャンバスに描く */
export function drawArtifact(ctx: CanvasRenderingContext2D, variantId: string, palette: number, size: number): void {
  const fn = ART[variantId];
  if (!fn) return;
  ctx.save();
  ctx.scale(size / 100, size / 100);
  fn(ctx, CLAY_PALETTE[palette % CLAY_PALETTE.length]!);
  ctx.restore();
}

/** 種類×色×大きさごとに一度だけ描いて使い回す（詳細設計 8.1） */
export class SpriteCache {
  private map = new Map<string, HTMLCanvasElement>();
  private pxSize = 0;

  setSize(px: number): void {
    const s = Math.max(16, Math.round(px));
    if (s !== this.pxSize) {
      this.pxSize = s;
      this.map.clear();
    }
  }

  get(variantId: string, palette: number): HTMLCanvasElement {
    const key = `${variantId}|${palette}`;
    let cv = this.map.get(key);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = cv.height = this.pxSize;
      const ctx = cv.getContext('2d')!;
      drawArtifact(ctx, variantId, palette, this.pxSize);
      this.map.set(key, cv);
    }
    return cv;
  }
}
