import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty, type PlayMode } from '../core/config';
import { CUSTOM_NAME } from '../core/custom';
import type { Stats } from '../core/types';
import { ARTIFACTS, firstDifficultyOf } from '../data/artifacts';
import { drawArtifact } from '../render/art';

export type ScreenName = 'title' | 'difficulty' | 'custom' | 'howto' | 'pause' | 'ending' | 'result' | 'ranking';

const IDS: Record<ScreenName, string> = {
  title: 'scr-title',
  difficulty: 'scr-difficulty',
  custom: 'scr-custom',
  howto: 'scr-howto',
  pause: 'scr-pause',
  ending: 'scr-ending',
  result: 'scr-result',
  ranking: 'scr-ranking',
};

/** DOMの画面（タイトル・遊び方・一時停止・終了・リザルト・ランキング） */
export class Screens {
  constructor(onAction: (act: string) => void) {
    this.buildDifficultyButtons();
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
    if (name === 'custom') document.getElementById('scr-custom')!.scrollTop = 0;
  }

  setMuted(muted: boolean): void {
    document.querySelectorAll('.mute-label').forEach((el) => (el.textContent = muted ? '音：オフ' : '音：オン'));
  }

  /** タイトルの自己ベスト（前回選んだ難易度のもの。詳細設計 17.6） */
  setBest(diff: Difficulty, best: number): void {
    document.querySelectorAll('.best-diff').forEach((el) => (el.textContent = DIFFICULTIES[diff].name));
    document.querySelectorAll('.best-score').forEach((el) => (el.textContent = best.toLocaleString('ja-JP')));
  }

  /** 難易度を選ぶ画面で、選んでいる難易度に枠を付ける */
  selectDifficulty(diff: PlayMode): void {
    document.querySelectorAll<HTMLElement>('.diff-btn').forEach((b) => b.classList.toggle('selected', b.dataset.diff === diff));
  }

  /** best が null ならカスタム（自己ベストを記録しない。D-50） */
  fillResult(s: Stats, best: number | null, isNew: boolean, diff: PlayMode): void {
    const set = (id: string, v: string) => (document.getElementById(id)!.textContent = v);
    setDiffTag(document.getElementById('r-diff')!, diff);
    set('r-score', s.score.toLocaleString('ja-JP'));
    document.getElementById('r-new')!.hidden = !isNew;
    set('r-correct', `${s.correct}`);
    set('r-sorted', `${s.sorted}`);
    set('r-miss', `${s.misses}（誤仕分け ${s.wrong}・見逃し ${s.passed}）`);
    set('r-combo', `${s.maxCombo}`);
    set('r-acc', s.accuracy === null ? '—' : `${(s.accuracy * 100).toFixed(1)}%`);
    const sec = Math.floor(s.playTimeSec);
    set('r-time', `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);
    set('r-best', best === null ? '—（ランキング対象外）' : best.toLocaleString('ja-JP'));
  }

  setRetryEnabled(on: boolean): void {
    (document.getElementById('btn-retry') as HTMLButtonElement).disabled = !on;
  }

  private buildDifficultyButtons(): void {
    const box = document.getElementById('diff-list')!;
    DIFFICULTY_ORDER.forEach((id, i) => {
      const d = DIFFICULTIES[id];
      const b = document.createElement('button');
      b.className = 'btn diff-btn';
      b.dataset.act = `diff:${id}`;
      b.dataset.diff = id;
      const name = document.createElement('span');
      name.className = 'diff-name';
      name.textContent = d.name;
      const info = document.createElement('span');
      info.className = 'diff-info';
      const kinds = d.maxVariants >= 16 ? `${d.startVariants}→全${d.maxVariants}` : `${d.startVariants}→${d.maxVariants}`;
      info.append(`種類 ${kinds}（各）`, document.createElement('br'), `点数 ×${d.scoreMult.toFixed(1)}`);
      const key = document.createElement('span');
      key.className = 'hint-keys only-desktop';
      key.textContent = String(i + 1);
      b.append(key, name, info);
      box.append(b);
    });
    // カスタム（詳細設計 19.4）
    const b = document.createElement('button');
    b.className = 'btn diff-btn';
    b.dataset.act = 'diff:custom';
    b.dataset.diff = 'custom';
    const key = document.createElement('span');
    key.className = 'hint-keys only-desktop';
    key.textContent = '5';
    const name = document.createElement('span');
    name.className = 'diff-name';
    name.textContent = CUSTOM_NAME;
    const info = document.createElement('span');
    info.className = 'diff-info';
    info.append('自分で決める', document.createElement('br'), 'ランキング対象外');
    b.append(key, name, info);
    box.append(b);
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
        const tag = document.createElement('span');
        const first = firstDifficultyOf(a.id);
        setDiffTag(tag, first, first === 'extreme' ? '激むず' : `${DIFFICULTIES[first].name}〜`);
        fig.append(cv, cap, tag);
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

/** 難易度の札（色と文字。詳細設計 17.6、R15） */
export function setDiffTag(el: HTMLElement, diff: PlayMode, text = diff === 'custom' ? CUSTOM_NAME : DIFFICULTIES[diff].name): void {
  el.classList.add('diff-tag');
  el.dataset.diff = diff;
  el.textContent = text;
}
