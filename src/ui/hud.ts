/** HUD（スコア・倍率・コンボ・ミス）。値が変わったときだけDOMを書き換える。 */
export class Hud {
  private elScore = document.getElementById('hud-score')!;
  private elCombo = document.getElementById('hud-combo')!;
  private elMult = document.getElementById('hud-mult')!;
  private elBox = document.getElementById('hud-combo-box')!;
  private dots = [...document.querySelectorAll<HTMLElement>('.miss-dot')];
  private elMilestone = document.getElementById('milestone')!;
  private last = { score: -1, combo: -1, mult: -1, misses: -1 };
  private bumpTimer = 0;
  private msTimer = 0;

  update(score: number, combo: number, mult: number, misses: number): void {
    const l = this.last;
    if (score !== l.score) this.elScore.textContent = score.toLocaleString('ja-JP');
    if (combo !== l.combo) {
      this.elCombo.textContent = String(combo);
      this.elBox.classList.toggle('zero', combo === 0);
      this.elBox.classList.toggle('glow', combo >= 10);
    }
    if (mult !== l.mult) this.elMult.textContent = `×${mult.toFixed(1)}`;
    if (misses !== l.misses) this.dots.forEach((d, i) => d.classList.toggle('on', i < misses));
    this.last = { score, combo, mult, misses };
  }

  reset(): void {
    this.last = { score: -1, combo: -1, mult: -1, misses: -1 };
    this.elMilestone.hidden = true;
  }

  bump(): void {
    this.elBox.classList.add('bump');
    clearTimeout(this.bumpTimer);
    this.bumpTimer = window.setTimeout(() => this.elBox.classList.remove('bump'), 90);
  }

  /** 難易度の表示（詳細設計 17.6） */
  setDifficulty(name: string, id: string): void {
    const el = document.getElementById('hud-diff')!;
    el.textContent = name;
    el.dataset.diff = id;
  }

  milestone(combo: number, mult: number): void {
    this.flash(`${combo} COMBO!  ×${mult.toFixed(1)}`);
  }

  /** 新しい種類が加わったとき（詳細設計 17.2、R12）。名前は出さない */
  unlock(): void {
    this.flash('新しい出土品が加わった！');
  }

  private flash(text: string): void {
    const el = this.elMilestone;
    el.textContent = text;
    el.hidden = true;
    void el.offsetWidth; // アニメーションをやり直す
    el.hidden = false;
    clearTimeout(this.msTimer);
    this.msTimer = window.setTimeout(() => (el.hidden = true), 850);
  }
}
