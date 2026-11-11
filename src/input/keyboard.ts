import type { Side } from '../core/types';
import { eventTime } from '../app/clock';

export interface KeyHandlers {
  sortDown(source: string, side: Side, ms: number): void;
  sortUp(source: string): void;
  command(code: string): void;
}

/** 物理キーの位置（event.code）で判定する（詳細設計 6.2） */
const SORT_KEYS: Record<string, Side> = { KeyA: 'L', ArrowLeft: 'L', KeyD: 'R', ArrowRight: 'R' };
const COMMAND_KEYS = new Set([
  'Space', 'Escape', 'Enter', 'NumpadEnter', 'KeyR',
  // 難易度を選ぶ画面（詳細設計 17.6）
  'ArrowUp', 'ArrowDown', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4',
]);
const BLOCK_DEFAULT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
}

export function bindKeyboard(h: KeyHandlers): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // 名前欄などで文字を入力しているときは、ゲームの操作として扱わない（詳細設計 16.9）
    if (isTyping(e.target)) return;
    const side = SORT_KEYS[e.code];
    if (BLOCK_DEFAULT.has(e.code) || side || COMMAND_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return; // 長押しのリピートは常に無視
    if (side) {
      h.sortDown(`key:${e.code}`, side, eventTime(e));
      return;
    }
    if (COMMAND_KEYS.has(e.code)) h.command(e.code === 'NumpadEnter' ? 'Enter' : e.code.replace(/^Numpad(\d)$/, 'Digit$1'));
  });
  window.addEventListener('keyup', (e) => {
    if (SORT_KEYS[e.code]) h.sortUp(`key:${e.code}`);
    if (BLOCK_DEFAULT.has(e.code) && !isTyping(e.target)) e.preventDefault();
  });
}
