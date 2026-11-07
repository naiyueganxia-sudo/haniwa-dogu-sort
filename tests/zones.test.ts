import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG as C, derive } from '../src/core/config';
import { zoneOf } from '../src/core/zones';

const d = derive(C);

describe('エリア（D-02, 詳細設計 2.2）', () => {
  it('基準速度で先行0.35秒・通常1.15秒の長さになる', () => {
    expect((C.judgeY - d.normalStart) / d.baseSpeed).toBeCloseTo(1.15, 9);
    expect((d.normalStart - d.earlyStart) / d.baseSpeed).toBeCloseTo(0.35, 9);
    expect(d.earlyStart).toBeCloseTo(571.43, 1);
    expect(d.normalStart).toBeCloseTo(671.43, 1);
  });

  it('境界は上側を含む', () => {
    expect(zoneOf(d.earlyStart - 0.001, C, d)).toBe('waiting');
    expect(zoneOf(d.earlyStart, C, d)).toBe('early');
    expect(zoneOf(d.normalStart - 0.001, C, d)).toBe('early');
    expect(zoneOf(d.normalStart, C, d)).toBe('normal');
    expect(zoneOf(C.judgeY - 0.001, C, d)).toBe('normal');
    expect(zoneOf(C.judgeY, C, d)).toBe('passed');
    expect(zoneOf(C.spawnY, C, d)).toBe('waiting');
  });
});
