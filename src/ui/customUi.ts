import {
  CUSTOM_SPEED_MAX,
  CUSTOM_SPEED_MIN,
  CUSTOM_SPEED_STEP,
  clampSpeed,
  customCounts,
  defaultCustom,
  firstN,
  speedText,
  type CustomSettings,
} from '../core/custom';
import type { Category } from '../core/types';
import { CATEGORY_NAME, variantsOf } from '../data/artifacts';
import { drawArtifact } from '../render/art';

const $ = (id: string) => document.getElementById(id)!;

export interface CustomHooks {
  get(): CustomSettings;
  /** 変えるたびに呼ぶ（保存する。D-51） */
  set(c: CustomSettings): void;
  start(): void;
}

/** カスタム設定の画面（詳細設計 19.4） */
export class CustomUi {
  private readonly speed = $('cus-speed') as HTMLInputElement;
  private readonly speedUp = $('cus-speedup') as HTMLInputElement;
  private readonly startBtn = $('cus-start') as HTMLButtonElement;
  private readonly chips = new Map<string, HTMLButtonElement>();
  private built = false;

  constructor(private readonly hooks: CustomHooks) {
    this.speed.min = String(CUSTOM_SPEED_MIN);
    this.speed.max = String(CUSTOM_SPEED_MAX);
    this.speed.step = String(CUSTOM_SPEED_STEP);
    this.speed.addEventListener('input', () => this.update({ speed: clampSpeed(Number(this.speed.value)) }));
    $('cus-slower').addEventListener('click', () => this.update({ speed: clampSpeed(this.hooks.get().speed - CUSTOM_SPEED_STEP) }));
    $('cus-faster').addEventListener('click', () => this.update({ speed: clampSpeed(this.hooks.get().speed + CUSTOM_SPEED_STEP) }));
    this.speedUp.addEventListener('change', () => this.update({ speedUp: this.speedUp.checked }));
    this.startBtn.addEventListener('click', () => {
      this.startBtn.blur();
      if (this.canStart()) this.hooks.start();
    });
    $('cus-reset').addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      this.hooks.set(defaultCustom());
      this.render();
    });
  }

  /** 画面を開いたとき */
  open(): void {
    if (!this.built) this.build();
    this.render();
  }

  canStart(): boolean {
    return this.hooks.get().variants.length > 0;
  }

  private build(): void {
    this.built = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const cat of ['haniwa', 'dogu'] as const) {
      const box = $(`cus-${cat}`);
      // 見出しと「全部」「なし」「先頭から ◀ n ▶ 種」（D-46、R22）
      const head = document.createElement('div');
      head.className = 'cus-cat-head';
      const h3 = document.createElement('h3');
      h3.textContent = `${CATEGORY_NAME[cat]} `;
      const cnt = document.createElement('span');
      cnt.className = 'cus-count';
      cnt.id = `cus-count-${cat}`;
      h3.append(cnt);
      const tools = document.createElement('div');
      tools.className = 'cus-tools';
      const tool = (label: string, aria: string, fn: () => void) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn small cus-tool';
        b.textContent = label;
        b.setAttribute('aria-label', aria);
        b.addEventListener('click', () => {
          b.blur();
          fn();
        });
        return b;
      };
      const count = () => customCounts(this.hooks.get())[cat];
      const n = document.createElement('span');
      n.className = 'cus-n';
      n.id = `cus-n-${cat}`;
      tools.append(
        tool('全部', `${CATEGORY_NAME[cat]}を全部選ぶ`, () => this.setFirst(cat, 16)),
        tool('なし', `${CATEGORY_NAME[cat]}を全部外す`, () => this.setFirst(cat, 0)),
        Object.assign(document.createElement('span'), { className: 'cus-from', textContent: '先頭から' }),
        tool('◀', '1種へらす', () => this.setFirst(cat, count() - 1)),
        n,
        tool('▶', '1種ふやす', () => this.setFirst(cat, count() + 1)),
        Object.assign(document.createElement('span'), { className: 'cus-from', textContent: '種' }),
      );
      head.append(h3, tools);
      const grid = document.createElement('div');
      grid.className = 'cus-grid';
      for (const a of variantsOf(cat)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cus-chip';
        b.dataset.id = a.id;
        const cv = document.createElement('canvas');
        cv.width = cv.height = Math.round(44 * dpr);
        drawArtifact(cv.getContext('2d')!, a.id, 0, cv.width);
        const cap = document.createElement('span');
        cap.textContent = a.name;
        b.append(cv, cap);
        b.addEventListener('click', () => {
          b.blur();
          this.toggle(a.id);
        });
        grid.append(b);
        this.chips.set(a.id, b);
      }
      box.append(head, grid);
    }
  }

  private update(p: Partial<CustomSettings>): void {
    this.hooks.set({ ...this.hooks.get(), ...p });
    this.render();
  }

  private toggle(id: string): void {
    const c = this.hooks.get();
    const set = new Set(c.variants);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.update({ variants: this.ordered(set) });
  }

  /** その分類を「先頭から n 種」にする（もう片方の分類はそのまま） */
  private setFirst(cat: Category, n: number): void {
    const c = this.hooks.get();
    const other = new Set(variantsOf(cat).map((v) => v.id));
    const set = new Set(c.variants.filter((id) => !other.has(id)));
    for (const id of firstN(cat, Math.min(16, Math.max(0, n)))) set.add(id);
    this.update({ variants: this.ordered(set) });
  }

  /** 一覧の順にそろえる */
  private ordered(set: Set<string>): string[] {
    return [...variantsOf('haniwa'), ...variantsOf('dogu')].map((v) => v.id).filter((id) => set.has(id));
  }

  private render(): void {
    const c = this.hooks.get();
    this.speed.value = c.speed.toFixed(1);
    $('cus-speed-text').textContent = speedText(c.speed);
    this.speedUp.checked = c.speedUp;
    const set = new Set(c.variants);
    for (const [id, b] of this.chips) {
      const on = set.has(id);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    const k = customCounts(c);
    for (const cat of ['haniwa', 'dogu'] as const) {
      $(`cus-count-${cat}`).textContent = `${k[cat]}／16種`;
      $(`cus-n-${cat}`).textContent = String(k[cat]);
    }
    const total = k.haniwa + k.dogu;
    const ratio = $('cus-ratio');
    if (total === 0) {
      ratio.textContent = '1つ以上選んでください';
      ratio.classList.add('warn');
    } else {
      const h = Math.round((k.haniwa / total) * 100);
      ratio.textContent = `はにわ ${h}%・土偶 ${100 - h}%（全${total}種）`;
      ratio.classList.remove('warn');
    }
    this.startBtn.disabled = total === 0;
  }
}
