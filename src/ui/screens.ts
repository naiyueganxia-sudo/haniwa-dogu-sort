import type { Stats } from '../core/types';
import { ARTIFACTS } from '../data/artifacts';
import { drawArtifact } from '../render/art';

export type ScreenName = 'title' | 'howto' | 'pause' | 'ending' | 'result' | 'ranking';

const IDS: Record<ScreenName, string> = {
  title: 'scr-title',
  howto: 'scr-howto',
  pause: 'scr-pause',
  ending: 'scr-ending',
  result: 'scr-result',
  ranking: 'scr-ranking',
};

/** DOMの画面（タイトル・遊び方・一時停止・終了・リザルト・ランキング） */
export class Screens {
  constructor(onAction: (act: string) => void) {
    document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        b.blur();
        onAction(b.dataset.act!);
      });
    });
    this.buildGallery();
    this.drawTitleArt();
  }

  show(name: ScreenName | null): void {
    (document.activeElement as HTMLElement | null)?.blur?.();
    for (const [k, id] of Object.entries(IDS)) document.getElementById(id)!.hidden = k !== name;
    if (name === 'howto') document.getElementById('scr-howto')!.scrollTop = 0;
  }

  setMuted(muted: boolean): void {
    document.querySelectorAll('.mute-label').forEach((el) => (el.textContent = muted ? '音：オフ' : '音：オン'));
  }

  setBest(best: number): void {
    document.querySelectorAll('.best-score').forEach((el) => (el.textContent = best.toLocaleString('ja-JP')));
  }

  fillResult(s: Stats, best: number, isNew: boolean): void {
    const set = (id: string, v: string) => (document.getElementById(id)!.textContent = v);
    set('r-score', s.score.toLocaleString('ja-JP'));
    document.getElementById('r-new')!.hidden = !isNew;
    set('r-correct', `${s.correct}`);
    set('r-sorted', `${s.sorted}`);
    set('r-miss', `${s.misses}（誤仕分け ${s.wrong}・見逃し ${s.passed}）`);
    set('r-combo', `${s.maxCombo}`);
    set('r-acc', s.accuracy === null ? '—' : `${(s.accuracy * 100).toFixed(1)}%`);
    const sec = Math.floor(s.playTimeSec);
    set('r-time', `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);
    set('r-best', best.toLocaleString('ja-JP'));
  }

  setRetryEnabled(on: boolean): void {
    (document.getElementById('btn-retry') as HTMLButtonElement).disabled = !on;
  }

  private buildGallery(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const cat of ['haniwa', 'dogu'] as const) {
      const box = document.getElementById(`gallery-${cat}`)!;
      for (const a of ARTIFACTS.filter((x) => x.category === cat)) {
        const fig = document.createElement('figure');
        const cv = document.createElement('canvas');
        cv.width = cv.height = Math.round(72 * dpr);
        drawArtifact(cv.getContext('2d')!, a.id, 0, cv.width);
        const cap = document.createElement('figcaption');
        cap.textContent = a.name;
        fig.append(cv, cap);
        box.append(fig);
      }
    }
  }

  private drawTitleArt(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const [id, v, pal] of [
      ['title-h', 'h_miko', 0],
      ['title-d', 'd_shakoki', 2],
    ] as const) {
      const cv = document.getElementById(id) as HTMLCanvasElement;
      cv.style.width = cv.style.height = '96px';
      cv.width = cv.height = Math.round(96 * dpr);
      drawArtifact(cv.getContext('2d')!, v, pal, cv.width);
    }
  }
}
