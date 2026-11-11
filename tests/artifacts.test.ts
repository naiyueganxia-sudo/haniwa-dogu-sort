import { describe, expect, it } from 'vitest';
import { ARTIFACTS, firstDifficultyOf } from '../src/data/artifacts';
import { ART } from '../src/render/art';
import { CLAY_PALETTE } from '../src/render/art/common';
import { DEFAULT_CONFIG as C, DIFFICULTIES } from '../src/core/config';

describe('出土品のデータ（C-31, C-41）', () => {
  it('すべての種類に絵がある（絵だけ余ってもいない）', () => {
    for (const a of ARTIFACTS) expect(ART[a.id], a.id).toBeTypeOf('function');
    expect(Object.keys(ART).sort()).toEqual(ARTIFACTS.map((a) => a.id).sort());
  });

  it('はにわは h_、土偶は d_ で始まる（分類の取り違え防止）', () => {
    for (const a of ARTIFACTS) expect(a.id.startsWith(a.category === 'haniwa' ? 'h_' : 'd_'), a.id).toBe(true);
  });

  it('各分類に16種類（激むずの上限と同じ。詳細設計 17.1）', () => {
    expect(ARTIFACTS.filter((a) => a.category === 'haniwa').length).toBe(16);
    expect(ARTIFACTS.filter((a) => a.category === 'dogu').length).toBe(16);
    expect(DIFFICULTIES.extreme.maxVariants).toBe(16);
  });

  it('id の重複がない', () => {
    expect(new Set(ARTIFACTS.map((a) => a.id)).size).toBe(ARTIFACTS.length);
  });

  it('最初に出てくる難易度（遊び方の札）', () => {
    expect(firstDifficultyOf('h_cylinder')).toBe('easy');
    expect(firstDifficultyOf('h_chicken')).toBe('normal');
    expect(firstDifficultyOf('h_boat')).toBe('normal');
    expect(firstDifficultyOf('h_rikishi')).toBe('hard');
    expect(firstDifficultyOf('h_asagao')).toBe('extreme');
    expect(firstDifficultyOf('d_tsutsu')).toBe('extreme');
  });

  it('色のパレットの数と設定が一致（両分類共通）', () => {
    expect(CLAY_PALETTE.length).toBe(C.paletteSize);
  });
});
