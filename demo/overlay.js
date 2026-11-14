// 録画のときだけページに差し込むもの（詳細設計 18.4・18.7）。ゲーム本体には含めない。
// 時刻はすべて performance.now()（Playwright で止めた時計）を使う。
(() => {
  const state = { ripples: [], keys: { L: -1e9, R: -1e9 }, built: false };
  const starts = new WeakMap();
  let el = null;

  function build() {
    if (state.built || !document.body) return;
    state.built = true;
    const css = document.createElement('style');
    css.textContent = `
      #reg { display: none !important; }
      #demo-ov { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; overflow: hidden;
        font-family: system-ui, -apple-system, 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif; }
      #demo-ov .telop { position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap; text-align: center;
        color: #fff; font-weight: 900; line-height: 1.25; letter-spacing: 0.04em; padding: 12px 26px; border-radius: 18px;
        background: rgba(30, 18, 8, 0.78); box-shadow: 0 4px 18px rgba(0,0,0,0.45); border: 2px solid rgba(255, 210, 120, 0.7); }
      #demo-ov .telop b { color: #ffd36b; }
      #demo-ov .ripple { position: absolute; border-radius: 50%; border: 5px solid rgba(255,255,255,0.95);
        box-shadow: 0 0 12px rgba(255,255,255,0.6); transform: translate(-50%, -50%); }
      #demo-ov .keys { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; gap: 14px; }
      #demo-ov .key { width: 56px; height: 50px; border-radius: 10px; display: grid; place-items: center; font-size: 28px; font-weight: 900;
        color: #f4e6cf; background: rgba(40, 26, 12, 0.85); border: 2px solid rgba(244, 230, 207, 0.55); box-shadow: 0 4px 0 rgba(0,0,0,0.4); }
      #demo-ov .key.on { background: #ffd36b; color: #2a1a08; border-color: #fff; transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,0.4); }
      #demo-ov .end { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; gap: 18px;
        background: rgba(24, 14, 6, 0.96); color: #fff; }
      #demo-ov .end .name { font-weight: 900; line-height: 1.3; color: #ffd36b; }
      #demo-ov .end .sub { font-weight: 800; color: #fff; }
      #demo-ov .end .pill { justify-self: center; font-weight: 800; padding: 8px 22px; border-radius: 999px; background: #ffd36b; color: #2a1a08; }
    `;
    document.head.append(css);
    el = document.createElement('div');
    el.id = 'demo-ov';
    document.body.append(el);
  }

  /** CSS の動きを止めた時計に合わせる（DevTools の機能で全体を止めたうえで、コマごとに位置を決める） */
  function syncAnimations(now) {
    for (const a of document.getAnimations()) {
      if (!starts.has(a)) {
        // 直前のコマから今までのどこかで始まった。間をとって半コマ前とする
        starts.set(a, now - 16);
        try { a.pause(); } catch {}
      }
      try { a.currentTime = Math.max(0, now - starts.get(a)); } catch {}
    }
  }

  window.__demoRipple = (x, y) => state.ripples.push({ x, y, t: performance.now() });
  window.__demoKey = (side) => (state.keys[side] = performance.now());

  /** コマごとに呼ぶ。opts：{ telop: {html, opacity, top, size} | null, end: {opacity, portrait} | null, keys: boolean } */
  window.__demoFrame = (opts) => {
    build();
    const now = performance.now();
    syncAnimations(now);
    const parts = [];
    if (opts.telop && opts.telop.opacity > 0) {
      const t = opts.telop;
      parts.push(`<div class="telop" style="top:${t.top};font-size:${t.size}px;opacity:${t.opacity}">${t.html}</div>`);
    }
    state.ripples = state.ripples.filter((r) => now - r.t < 450);
    for (const r of state.ripples) {
      const k = Math.min(1, Math.max(0, (now - r.t) / 420));
      const d = 26 + k * 110;
      parts.push(`<div class="ripple" style="left:${r.x}px;top:${r.y}px;width:${d}px;height:${d}px;opacity:${1 - k}"></div>`);
    }
    if (opts.keys) {
      const on = (s) => (now - state.keys[s] < 160 ? ' on' : '');
      parts.push(`<div class="keys"><div class="key${on('L')}">←</div><div class="key${on('R')}">→</div></div>`);
    }
    if (opts.end && opts.end.opacity > 0) {
      const p = opts.end.portrait;
      parts.push(
        `<div class="end" style="opacity:${opts.end.opacity}">` +
          `<div class="name" style="font-size:${p ? 46 : 50}px">はにわと土偶の<br>エンドレス仕分けゲーム</div>` +
          `<div class="pill" style="font-size:${p ? 26 : 28}px">ブラウザですぐ遊べる</div>` +
        `</div>`,
      );
    }
    el.innerHTML = parts.join('');
  };
})();
