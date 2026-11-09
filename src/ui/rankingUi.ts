import { checkName } from '../core/name';
import { qualifyRank, RANKING_SIZE, type RankEntry } from '../core/rankingTypes';
import type { RankingClient, SubmitResult } from '../net/ranking';

/** このプレイの登録に必要なもの。登録できないプレイは token・log が null */
export interface ResultContext {
  score: number;
  token: string | null;
  log: string | null;
}

export interface RankingUiHooks {
  getBest(): number;
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
    const entries = await this.client.fetchRanking();
    if (gen !== this.gen) return;
    if (!entries) {
      this.msg('ランキングに接続できませんでした');
      this.setButtons({ retry: true });
      return;
    }
    const rank = qualifyRank(entries, ctx.score);
    if (rank === null) {
      const last = entries[RANKING_SIZE - 1]!;
      this.msg(`30位まで あと ${(last.score - ctx.score + 1).toLocaleString('ja-JP')} 点`);
      this.setButtons({ view: true });
      return;
    }
    this.msg(`ランキング ${rank}位 に入ります！`, true);
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
    const r: SubmitResult = await this.client.submit({ token: ctx.token, name: nc.name, log: ctx.log, score: ctx.score });
    if (gen !== this.gen) return;
    this.sending = false;
    this.setFormDisabled(false);
    this.regErr.textContent = '';
    if (r.ok) {
      this.hooks.setLastName(nc.name);
      this.myId = r.res.id;
      this.ctx = null;
      this.regForm.hidden = true;
      this.msg(
        r.res.rank <= RANKING_SIZE
          ? `${r.res.rank}位 に登録しました！`
          : `${r.res.rank}位 で登録しました（30位より下のため表には出ません）`,
        r.res.rank <= RANKING_SIZE,
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

  /** ランキング画面を開いたとき */
  openScreen(): void {
    $('rank-wrap').scrollTop = 0;
    document.querySelectorAll('.best-score').forEach((el) => (el.textContent = this.hooks.getBest().toLocaleString('ja-JP')));
    if (this.client.entries) this.render(this.client.entries);
    void this.loadRanking();
  }

  private async loadRanking(): Promise<void> {
    const msg = $('rank-msg');
    $('rank-reload').hidden = true;
    if (!this.client.entries) {
      msg.textContent = '読み込み中…';
      msg.hidden = false;
      $('rank-list').replaceChildren();
    }
    const entries = await this.client.fetchRanking();
    if (entries) this.render(entries);
    else if (!this.client.entries) {
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
      const cells: [string, string][] = [
        ['rank-no', `${e.rank}`],
        ['rank-name', e.name],
        ['rank-score', e.score.toLocaleString('ja-JP')],
        ['rank-date', `${d.getMonth() + 1}/${d.getDate()}`],
      ];
      for (const [cls, text] of cells) {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        li.append(span);
      }
      return li;
    });
    $('rank-list').replaceChildren(...rows);
    const mine = $('rank-list').querySelector('.mine');
    if (mine) (mine as HTMLElement).scrollIntoView({ block: 'nearest' });
  }
}
