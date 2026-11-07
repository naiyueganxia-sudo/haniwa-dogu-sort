import type { Side } from '../core/types';
import { eventTime } from '../app/clock';

export interface TouchHandlers {
  sortDown(source: string, side: Side, ms: number): void;
  sortUp(source: string): void;
  touchSeen(): void;
}

/**
 * タッチ入力（D-13、詳細設計 6.3）。
 * 指が触れた瞬間（pointerdown）に判定。指を滑らせて反対側に入っても入力しない。
 */
export function bindTouch(h: TouchHandlers): void {
  const btnL = document.getElementById('btn-L')!;
  const btnR = document.getElementById('btn-R')!;
  const active = new Map<number, HTMLElement>();

  const down = (el: HTMLElement, side: Side) => (e: PointerEvent) => {
    e.preventDefault();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    active.set(e.pointerId, el);
    el.classList.add('down');
    h.sortDown(`pointer:${e.pointerId}`, side, eventTime(e));
  };
  btnL.addEventListener('pointerdown', down(btnL, 'L'));
  btnR.addEventListener('pointerdown', down(btnR, 'R'));

  const up = (e: PointerEvent) => {
    const el = active.get(e.pointerId);
    if (!el) return;
    active.delete(e.pointerId);
    if (![...active.values()].includes(el)) el.classList.remove('down');
    h.sortUp(`pointer:${e.pointerId}`);
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  // タッチ機器の検出（P-20：タッチを使った時点でボタンを表示）
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') h.touchSeen();
    },
    { capture: true },
  );

  // 誤操作の抑止：ダブルタップ・ピンチ拡大、長押しメニュー、ゲーム部分のスクロール
  const noDefault = (e: Event) => e.preventDefault();
  for (const el of [btnL, btnR, document.getElementById('stage')!, document.getElementById('game')!]) {
    el.addEventListener('touchstart', noDefault, { passive: false });
  }
  document.addEventListener('gesturestart', noDefault, { passive: false } as AddEventListenerOptions);
  document.addEventListener('dblclick', noDefault, { passive: false });
  document.addEventListener('contextmenu', noDefault);
}

/** 全解除（フォーカス喪失時など） */
export function releaseAllButtons(): void {
  document.querySelectorAll('.sort-btn.down').forEach((el) => el.classList.remove('down'));
}
