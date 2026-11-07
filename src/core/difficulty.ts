import type { GameConfig, Point } from './config';

/** 制御点を直線でつなぐ。範囲外は端の値。 */
export function interpolate(points: readonly Point[], x: number): number {
  if (points.length === 0) throw new Error('no points');
  const first = points[0]!;
  if (x <= first[0]) return first[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return points[points.length - 1]![1];
}

/** n 番目（0始まり）の出土品が出現したときのコンベア速度（論理座標/秒） */
export function speedFor(n: number, cfg: GameConfig, baseSpeed: number): number {
  return baseSpeed * interpolate(cfg.speedPoints, n);
}

/** n 番目の出土品から次の出土品までの距離。最小間隔を下回らない（C-15・C-34）。 */
export function spacingFor(n: number, cfg: GameConfig, baseSpeed: number): number {
  return Math.max(cfg.minSpacing, interpolate(cfg.intervalPoints, n) * baseSpeed);
}
