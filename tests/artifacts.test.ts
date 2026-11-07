import { describe, expect, it } from 'vitest';
import { ARTIFACTS } from '../src/data/artifacts';
import { ART } from '../src/render/art';
import { CLAY_PALETTE } from '../src/render/art/common';
import { DEFAULT_CONFIG as C } from '../src/core/config';

describe('出土品のデータ（C-31, C-41）', () => {
  it('すべての種類に絵がある（絵だけ余ってもいない）', () => {
    for (const a of ARTIFACTS) expect(ART[a.id], a.id).toBeTypeOf('function');
    expect(Object.keys(ART).sort()).toEqual(ARTIFACTS.map((a) => a.id).sort());
  });

  it('はにわは h_、土偶は d_ で始まる（分類の取り違え防止）', () => {
    for (const a of ARTIFACTS) expect(a.id.startsWith(a.category === 'haniwa' ? 'h_' : 'd_'), a.id).toBe(true);
  });

  it('各分類に8種類', () => {
    expect(ARTIFACTS.filter((a) => a.category === 'haniwa').length).toBe(8);
    expect(ARTIFACTS.filter((a) => a.category === 'dogu').length).toBe(8);
  });

  it('色のパレットの数と設定が一致（両分類共通）', () => {
    expect(CLAY_PALETTE.length).toBe(C.paletteSize);
  });
});
