import { describe, expect, it } from 'vitest';
import { InputArbiter } from '../src/core/inputArbiter';

describe('入力の仲裁（D-06）', () => {
  it('押しっぱなしのリピートは無視', () => {
    const a = new InputArbiter(0.04);
    expect(a.down('key:KeyA', 'L', 1)).toBe(true);
    expect(a.down('key:KeyA', 'L', 1.5)).toBe(false);
    a.up('key:KeyA');
    expect(a.down('key:KeyA', 'L', 2)).toBe(true);
  });

  it('反対側が押下中かつ40ms以内なら後着は無効', () => {
    const a = new InputArbiter(0.04);
    expect(a.down('key:KeyA', 'L', 1.0)).toBe(true);
    expect(a.down('key:KeyD', 'R', 1.03)).toBe(false);
  });

  it('40msを超えたロールオーバーは有効', () => {
    const a = new InputArbiter(0.04);
    expect(a.down('key:KeyA', 'L', 1.0)).toBe(true);
    expect(a.down('key:KeyD', 'R', 1.05)).toBe(true);
  });

  it('反対側を離していれば40ms以内でも有効', () => {
    const a = new InputArbiter(0.04);
    expect(a.down('pointer:1', 'L', 1.0)).toBe(true);
    a.up('pointer:1');
    expect(a.down('pointer:2', 'R', 1.01)).toBe(true);
  });

  it('同じ側の別キーは別の押下', () => {
    const a = new InputArbiter(0.04);
    expect(a.down('key:KeyA', 'L', 1.0)).toBe(true);
    expect(a.down('key:ArrowLeft', 'L', 1.01)).toBe(true);
  });

  it('無効になった押下は「最後に受け付けた時刻」を更新しない', () => {
    const a = new InputArbiter(0.04);
    a.down('key:KeyA', 'L', 1.0);
    a.down('key:KeyD', 'R', 1.02); // 無効
    a.up('key:KeyA');
    // 左は離した。右は押下中だが受け付けていないので、左の新しい押下は有効
    expect(a.down('key:ArrowLeft', 'L', 1.03)).toBe(true);
  });

  it('全解除後は押下中の記録がない', () => {
    const a = new InputArbiter(0.04);
    a.down('key:KeyA', 'L', 1.0);
    a.reset();
    expect(a.isHeld('L')).toBe(false);
    expect(a.down('key:KeyA', 'L', 1.01)).toBe(true);
  });
});
