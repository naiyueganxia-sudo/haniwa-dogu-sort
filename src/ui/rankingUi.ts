import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../core/config';
import { checkName } from '../core/name';
import { qualifyRank, RANKING_SIZE, type RankEntry, type RankFilter } from '../core/rankingTypes';
import type { RankingClient, SubmitResult } from '../net/ranking';
import { setDiffTag } from './screens';

/** このプレイの登録に必要なもの。登録できないプレイは token・log が null */
export interface ResultContext {
  score: number;
  token: string | null;
  log: string | null;
  difficulty: Difficulty;
}

export interface RankingUiHooks {
  /** 難易度ごとの自己ベスト */
  getBest(): Record<Difficulty, number>;
  getLastName(): string;
  setLastName(name: string): void;
  /** ランキング画面を開く（リザルトの［ランキングを見る］） */
  openRanking(): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const NAME_ERRORS = {
  empty: '名前を入れてください',
  long: '名前は10文字までにしてください',
  char: '使えない文字が入っています',
  ng: 'この名前は使えません',
} as const;

/**
 * ランキング画面とリザルトの登録欄（詳細設計 16.9）
 */
export class RankingUi {
  /** 直前に自分が登録した記録（ランキングで強調表示） */
  private myId: number | null = null;
  private ctx: ResultContext | null = null;
  /** 画面を離れたら、遅れて届いた応答を無視するための番号 */
  private gen = 0;
  private sending = false;

  private reg = $('reg');
  private regMsg = $('reg-msg');
  private regForm = $('reg-form');
  private regName = $<HTMLInputElement>('reg-name');
  private regErr = $('reg-err');
  private regSubmit = $<HTMLButtonElement>('reg-submit');
  private regSkip = $<HTMLButtonElement>('reg-skip');
  private regRetry = $<HTMLButtonElement>('reg-retry');
  private regView = $<HTMLButtonElement>('reg-view');

  constructor(
    private client: RankingClient,
    private hooks: RankingUiHooks,
  ) {
    document.querySelectorAll<HTMLElement>('.needs-ranking').forEach((el) => (el.hidden = !client.enabled));
    this.regSubmit.addEventListener('click', () => void this.submit());
    this.regSkip.addEventListener('click', () => this.skip());
    this.regRetry.addEventListener('click', () => {
      if (this.ctx) void this.startResult(this.ctx);
    });
    this.regView.addEventListener('click', () => this.hooks.openRanking());
    $('rank-reload').addEventListener('click', () => void this.loadRanking());
    // 名前欄の Enter＝登録（日本語入力の変換確定の Enter は除く）
    this.regName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        void this.submit();
      }
    });
    this.regName.addEventListener('input', () => (this.regErr.textContent = ''));
  }

  // ===== リザルトの登録欄 =====

  /** リザルト画面を出したとき */
  async startResult(ctx: ResultContext): Promise<void> {
    const gen = ++this.gen;
    this.ctx = ctx;
    this.sending = false;
    this.setButtons({});
    this.regForm.hidden = true;
    this.regErr.textContent = '';
    if (!this.client.enabled || ctx.score <= 0) {
      this.reg.hidden = true;
      return;
    }
    this.reg.hidden = false;
    if (!ctx.token || !ctx.log) {
      this.msg('通信できなかったため、このプレイはランキングに登録できません');
      return;
    }
    this.msg('ランキングを確認中…');
    // 全体の表とその難易度の表の両方を見る（D-39）
    const [all, mine] = await Promise.all([this.client.fetchRanking('all'), this.client.fetchRanking(ctx.difficulty)]);
    if (gen !== this.gen) return;
    if (!all || !mine) {
      this.msg('ランキングに接続できませんでした');
      this.setButtons({ retry: true });
      return;
    }
    const rankAll = qualifyRank(all, ctx.score);
    const rankDiff = qualifyRank(mine, ctx.score);
    if (rankAll === null && rankDiff === null) {
      const last = all[RANKING_SIZE - 1]!;
      this.msg(`30位まで あと ${(last.score - ctx.score + 1).toLocaleString('ja-JP')} 点`);
      this.setButtons({ view: true });
      return;
    }
    this.msg(`ランキング ${this.rankText(rankAll, rankDiff ?? 0, ctx.difficulty)} に入ります！`, true);
    this.regName.value = this.hooks.getLastName();
    this.regForm.hidden = false;
  }

  /** リトライ・タイトルへ移ったとき（そのプレイは後から登録できない） */
  leaveResult(): void {
    this.gen++;
    this.ctx = null;
    this.sending = false;
  }

  private skip(): void {
    if (this.sending) return;
    this.ctx = null;
    this.regForm.hidden = true;
    this.msg('登録しませんでした');
    this.setButtons({ view: true });
  }

  private async submit(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !ctx.token || !ctx.log || this.sending || this.regForm.hidden) return;
    const nc = checkName(this.regName.value);
    if (!nc.ok) {
      this.regErr.textContent = NAME_ERRORS[nc.reason];
      return;
    }
    const gen = this.gen;
    this.sending = true;
    this.regName.blur();
    this.setFormDisabled(true);
    this.regErr.textContent = '登録中…';
    const r: SubmitResult = await this.client.submit({
      token: ctx.token,
      name: nc.name,
      log: ctx.log,
      score: ctx.score,
      difficulty: ctx.difficulty,
    });
    if (gen !== this.gen) return;
    this.sending = false;
    this.setFormDisabled(false);
    this.regErr.textContent = '';
    if (r.ok) {
      this.hooks.setLastName(nc.name);
      this.myId = r.res.id;
      this.ctx = null;
      this.regForm.hidden = true;
      const inAll = r.res.rank <= RANKING_SIZE;
      const inDiff = r.res.diffRank <= RANKING_SIZE;
      this.msg(
        inAll || inDiff
          ? `${this.rankText(inAll ? r.res.rank : null, r.res.diffRank, ctx.difficulty)} に登録しました！`
          : `${r.res.rank}位 で登録しました（30位より下のため表には出ません）`,
        inAll || inDiff,
      );
      this.setButtons({ view: true });
      return;
    }
    switch (r.error) {
      case 'name':
        this.regErr.textContent = NAME_ERRORS.ng;
        break;
      case 'rate':
        this.regErr.textContent = '時間をおいて、もう一度お試しください';
        break;
      case 'network':
      case 'server':
        this.regErr.textContent = '通信できませんでした。もう一度お試しください';
        break;
      case 'version':
        this.end('ゲームが更新されました。ページを再読み込みしてください');
        break;
      case 'duplicate':
        this.end('このプレイは登録済みです');
        break;
      default:
        this.end('登録できませんでした');
    }
  }

  /** 「全体 3位・激むず 1位」（全体に入らないときは「激むず 5位」） */
  private rankText(rankAll: number | null, rankDiff: number, diff: Difficulty): string {
    const d = `${DIFFICULTIES[diff].name} ${rankDiff}位`;
    return rankAll === null ? d : `全体 ${rankAll}位・${d}`;
  }

  private end(text: string): void {
    this.ctx = null;
    this.regForm.hidden = true;
    this.msg(text);
    this.setButtons({ view: true });
  }

  private msg(text: string, good = false): void {
    this.regMsg.textContent = text;
    this.regMsg.classList.toggle('good', good);
  }

  private setButtons(o: { retry?: boolean; view?: boolean }): void {
    this.regRetry.hidden = !o.retry;
    this.regView.hidden = !o.view;
  }

  private setFormDisabled(on: boolean): void {
    this.regName.disabled = on;
    this.regSubmit.disabled = on;
    this.regSkip.disabled = on;
  }

  // ===== ランキング画面 =====

  /** 表示中の絞り込み（D-38） */
  private filter: RankFilter = 'all';

  /** ランキング画面を開いたとき。filter はタイトルからなら「すべて」、リザルトからならそのプレイの難易度 */
  openScreen(filter: RankFilter = 'all'): void {
    this.buildTabs();
    // 自己ベスト（4つの難易度を並べる。詳細設計 17.6）
    const best = this.hooks.getBest();
    $('rank-bests').replaceChildren(
      ...DIFFICULTY_ORDER.map((d) => {
        const box = document.createElement('div');
        const tag = document.createElement('span');
        setDiffTag(tag, d);
        box.append(tag, best[d].toLocaleString('ja-JP'));
        return box;
      }),
    );
    this.setFilter(filter);
  }

  private buildTabs(): void {
    const box = $('rank-tabs');
    if (box.childElementCount) return;
    const filters: RankFilter[] = ['all', ...DIFFICULTY_ORDER];
    for (const f of filters) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rank-tab';
      b.dataset.filter = f;
      if (f !== 'all') b.dataset.diff = f;
      b.setAttribute('role', 'tab');
      b.textContent = f === 'all' ? 'すべて' : DIFFICULTIES[f].name;
      b.addEventListener('click', () => {
        b.blur();
        this.setFilter(f);
      });
      box.append(b);
    }
  }

  private setFilter(f: RankFilter): void {
    this.filter = f;
    document.querySelectorAll<HTMLElement>('.rank-tab').forEach((b) => {
      const on = b.dataset.filter === f;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    $('rank-wrap').scrollTop = 0;
    const cached = this.client.cachedRanking(f);
    if (cached) this.render(cached);
    void this.loadRanking();
  }

  private async loadRanking(): Promise<void> {
    const f = this.filter;
    const msg = $('rank-msg');
    $('rank-reload').hidden = true;
    if (!this.client.cachedRanking(f)) {
      msg.textContent = '読み込み中…';
      msg.hidden = false;
      $('rank-list').replaceChildren();
    }
    const entries = await this.client.fetchRanking(f);
    if (f !== this.filter) return; // 読み込み中に切り替えた
    if (entries) this.render(entries);
    else if (!this.client.cachedRanking(f)) {
      msg.textContent = 'ランキングを読み込めませんでした';
      $('rank-reload').hidden = false;
    }
  }

  private render(entries: readonly RankEntry[]): void {
    const msg = $('rank-msg');
    msg.hidden = entries.length > 0;
    msg.textContent = 'まだ記録がありません';
    const rows = entries.map((e) => {
      const li = document.createElement('li');
      li.className = 'rank-row';
      if (e.rank <= 3) li.classList.add(`top${e.rank}`);
      if (e.id === this.myId) li.classList.add('mine');
      const d = new Date(e.at);
      const cell = (cls: string, text: string) => {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        return span;
      };
      // 名前の横に難易度の札（D-32）
      const name = document.createElement('span');
      name.className = 'rank-name';
      const tag = document.createElement('span');
      setDiffTag(tag, e.difficulty in DIFFICULTIES ? e.difficulty : 'normal');
      name.append(cell('rank-name-text', e.name), tag);
      li.append(
        cell('rank-no', `${e.rank}`),
        name,
        cell('rank-score', e.score.toLocaleString('ja-JP')),
        cell('rank-date', `${d.getMonth() + 1}/${d.getDate()}`),
      );
      return li;
    });
    $('rank-list').replaceChildren(...rows);
    const mine = $('rank-list').querySelector('.mine');
    if (mine) (mine as HTMLElement).scrollIntoView({ block: 'nearest' });
  }
}
