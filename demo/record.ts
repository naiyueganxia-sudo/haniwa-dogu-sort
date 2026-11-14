/**
 * デモムービーの録画（詳細設計 第18章）。
 * ゲームの時計を止め、1/30秒ずつ進めながら1コマずつ撮り、ffmpeg で mp4 にする。
 *   npm run record                 縦と横の2本
 *   npm run record -- portrait     縦だけ（landscape で横だけ）
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';
import { DEFAULT_CONFIG } from '../src/core/config';
import { makePlan, type Plan } from './plan';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'out');
const PORT = 5181;
const BASE = `http://127.0.0.1:${PORT}`;
const FPS = 30;
const VIDEO_SEC = 30;
/** 予定表を作る種（plan.ts の一覧から選んだ。最初に はにわ・土偶 が交互に出る） */
const SEED = 6;

type Orient = 'portrait' | 'landscape';

// ===== 動画の構成（詳細設計 18.6）。時刻はゲームの時計を止めてからのミリ秒 =====
const T_TAP_START = 3000; // タイトルの「スタート」を押す
const T_TAP_EXTREME = 4400; // 「激むず」を押す = ゲーム開始
const RESULT_SEC = 2.5; // 結果画面を見せる長さ
const END_SEC = 3.0; // 最後の文字の長さ

interface Timeline {
  plan: Plan;
  /** 撮る範囲（ゲームの時計を止めてからの ms。[開始, 終了)） */
  segments: [number, number][];
  /** ゲームが始まる時刻（ms） */
  t0: number;
  /** ゲームオーバーの演出が終わる時刻（ms）。キー表示はここまで */
  tPlayEnd: number;
}

function buildTimeline(): Timeline {
  const probe = makePlan(SEED, 1e9);
  const plan = makePlan(SEED, probe.tUnlock + 0.2);
  const t0 = T_TAP_EXTREME;
  const ms = (gameSec: number) => Math.round(t0 + gameSec * 1000);
  const b: [number, number] = [ms(plan.tCombo10 - 1.0), ms(plan.tCombo10 + 1.3)];
  const tPlayEnd = ms(plan.tOver + DEFAULT_CONFIG.gameoverAnimSec);
  const c: [number, number] = [ms(plan.tUnlock - 0.7), Math.round(tPlayEnd + (RESULT_SEC + END_SEC) * 1000)];
  // 残りの長さを最初の場面に回して、全体を30秒にする
  const restMs = VIDEO_SEC * 1000 - (b[1] - b[0]) - (c[1] - c[0]);
  const a: [number, number] = [0, restMs];
  if (a[1] >= b[0] || b[1] >= c[0]) throw new Error(`場面が重なる：A ${a} B ${b} C ${c}`);
  if (a[1] < t0 + 6000) throw new Error(`最初の場面が短すぎる：${a}`);
  return { plan, segments: [a, b, c], t0, tPlayEnd };
}

// ===== 開発用サーバー =====
async function startVite(): Promise<ChildProcess> {
  const vite = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  vite.stdout!.on('data', (d) => (log += d));
  vite.stderr!.on('data', (d) => (log += d));
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(BASE + '/');
      if (r.ok) return vite;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  vite.kill();
  throw new Error('開発用サーバーが起動しない\n' + log);
}

// ===== ffmpeg =====
function startEncoder(file: string): { write(b: Buffer): Promise<void>; end(): Promise<void> } {
  const ff = spawn(ffmpegPath as unknown as string, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-movflags', '+faststart',
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise<void>((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg が失敗 ' + code)))));
  let err: Error | null = null;
  ff.stdin!.on('error', (e) => (err = e));
  return {
    write: (b) =>
      new Promise((res, rej) => {
        if (err) return rej(err);
        if (ff.stdin!.write(b)) res();
        else ff.stdin!.once('drain', () => res());
      }),
    end: async () => {
      ff.stdin!.end();
      await done;
    },
  };
}

// ===== 1本ぶん =====
type Action = { ms: number; run: () => Promise<void> };

async function recordOne(browser: Browser, orient: Orient, tl: Timeline): Promise<void> {
  const portrait = orient === 'portrait';
  const context = await browser.newContext({
    viewport: portrait ? { width: 540, height: 960 } : { width: 960, height: 540 },
    deviceScaleFactor: 2,
    hasTouch: portrait,
    isMobile: portrait,
    locale: 'ja-JP',
  });
  // ランキングのサーバーなど、開発用サーバー以外への通信はすべて止める（18.3）
  const blocked: string[] = [];
  await context.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    blocked.push(u);
    return r.abort();
  });
  await context.clock.install({ time: new Date('2026-11-13T09:00:00+09:00') });
  await context.addInitScript({ path: path.join(HERE, 'overlay.js') });
  const page = await context.newPage();
  await page.goto(`${BASE}/?seed=${tl.plan.seed}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); // 絵や字体の読み込み（実時間）
  // 時計を止める。ずっと先の時刻にして、入力の時刻が必ず止めた時計に置き換わるようにする（18.4）
  await context.clock.pauseAt(new Date('2026-11-13T12:00:00+09:00'));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });

  let now = 0;
  const runTo = async (ms: number) => {
    if (ms > now) {
      await page.clock.runFor(ms - now);
      now = ms;
    }
  };

  const center = async (sel: string) => {
    const b = await page.locator(sel).boundingBox();
    if (!b) throw new Error('見つからない ' + sel);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
  };
  const ripple = (x: number, y: number) => page.evaluate(([x, y]) => (window as any).__demoRipple(x, y), [x, y]);
  const tapAt = async (x: number, y: number, withRipple = true) => {
    if (withRipple) await ripple(x, y);
    if (portrait) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };
  /** メニューのボタンは、押す少し前から波紋を出す（押した場所が見えるように） */
  const menuTap = (sel: string, ms: number): Action[] => {
    let pos = { x: 0, y: 0 };
    return [
      { ms: ms - 120, run: async () => { pos = await center(sel); await ripple(pos.x, pos.y); } },
      { ms, run: async () => { await tapAt(pos.x, pos.y, false); } },
    ];
  };

  // ----- 入力の予定 -----
  const actions: Action[] = [
    ...menuTap('[data-act="start"]', T_TAP_START),
    ...menuTap('[data-act="diff:extreme"]', tl.t0),
  ];
  let k = 0;
  for (const p of tl.plan.presses) {
    const ms = Math.round(tl.t0 + p.t * 1000);
    const i = k++;
    if (portrait) {
      actions.push({
        ms,
        run: async () => {
          const c = await center(p.side === 'L' ? '#btn-L' : '#btn-R');
          // 押す場所を毎回少しずらす
          const dx = (((i * 37) % 11) - 5) / 5;
          const dy = (((i * 53) % 9) - 4) / 4;
          await tapAt(c.x + dx * c.w * 0.18, c.y + dy * c.h * 0.15);
        },
      });
    } else {
      const key = p.side === 'L' ? 'ArrowLeft' : 'ArrowRight';
      actions.push({ ms, run: async () => { await page.evaluate((s) => (window as any).__demoKey(s), p.side); await page.keyboard.down(key); } });
      actions.push({ ms: ms + 70, run: async () => { await page.keyboard.up(key); } });
    }
  }

  // ----- 撮るコマ -----
  type Frame = { ms: number; videoSec: number };
  const frames: Frame[] = [];
  let v = 0;
  for (const [a, b] of tl.segments) {
    for (let j = 0; ; j++) {
      const ms = a + Math.round((j * 1000) / FPS);
      if (ms >= b) break;
      frames.push({ ms, videoSec: v / FPS });
      v++;
    }
  }
  const totalSec = frames.length / FPS;

  type Item = { ms: number; order: number; action?: Action; frame?: Frame };
  const items: Item[] = [
    ...actions.map((action) => ({ ms: action.ms, order: 0, action })),
    ...frames.map((frame) => ({ ms: frame.ms, order: 1, frame })),
  ].sort((x, y) => x.ms - y.ms || x.order - y.order);

  // ----- 重ねる文字（18.7） -----
  const fade = (t: number, a: number, b: number, f = 0.3) => Math.max(0, Math.min(1, (t - a) / f, (b - t) / f));
  const overlayAt = (f: Frame) => {
    const t = f.videoSec;
    const telopOp = fade(t, 0.2, 2.85);
    return {
      telop: telopOp > 0 ? {
        html: 'はにわ？ 土偶？<br><b>左右に仕分けろ！</b>',
        opacity: telopOp,
        top: portrait ? '5%' : '62%',
        size: portrait ? 40 : 34,
      } : null,
      end: { opacity: fade(t, totalSec - END_SEC, totalSec + 1, 0.4), portrait },
      keys: !portrait && f.ms >= tl.t0 && f.ms < tl.tPlayEnd,
    };
  };

  mkdirSync(path.join(OUT, 'stills'), { recursive: true });
  const file = path.join(OUT, `haniwa-demo-${orient}.mp4`);
  const enc = startEncoder(file);
  const stillAt = new Set([1.5, 4.0, 7.0, 11.0, 14.5, 16.5, 18.5, 21.0, 24.0, 26.5, 29.0].map((s) => Math.round(s * FPS)));
  let written = 0;
  const started = Date.now();
  for (const it of items) {
    await runTo(it.ms);
    if (it.action) {
      await it.action.run();
      continue;
    }
    const f = it.frame!;
    await page.evaluate((o) => (window as any).__demoFrame(o), overlayAt(f));
    const png = await page.screenshot({ type: 'png', caret: 'hide' });
    await enc.write(png);
    if (stillAt.has(written)) writeFileSync(path.join(OUT, 'stills', `${orient}-${(written / FPS).toFixed(1)}s.png`), png);
    written++;
    if (written % 150 === 0) console.log(`  ${orient}: ${written}/${frames.length} コマ（${((Date.now() - started) / 1000).toFixed(0)}秒）`);
  }
  await enc.end();

  // ----- 確認（18.10） -----
  const shown = await page.evaluate(() => ({
    score: document.getElementById('r-score')?.textContent ?? '',
    correct: document.getElementById('r-correct')?.textContent ?? '',
    combo: document.getElementById('r-combo')?.textContent ?? '',
  }));
  const expect = tl.plan.score.toLocaleString('ja-JP');
  console.log(`  ${orient}: 結果の点数 ${shown.score}（予定表 ${expect}）正解 ${shown.correct} 最大コンボ ${shown.combo}`);
  console.log(`  ${orient}: 止めた通信 ${blocked.length} 件${blocked.length ? '：' + [...new Set(blocked.map((u) => new URL(u).origin))].join(', ') : ''}`);
  console.log(`  ${orient}: ${file}（${written} コマ = ${(written / FPS).toFixed(2)} 秒）`);
  await context.close();
  if (shown.score.replace(/[^\d]/g, '') !== String(tl.plan.score)) throw new Error(`${orient}: 点数が予定表と違う（押した時刻がずれている）`);
}

async function main(): Promise<void> {
  const only = process.argv[2] as Orient | undefined;
  const orients: Orient[] = only ? [only] : ['portrait', 'landscape'];
  const tl = buildTimeline();
  console.log(
    `種 ${tl.plan.seed}：10コンボ ${tl.plan.tCombo10.toFixed(2)}秒、種類が増える ${tl.plan.tUnlock.toFixed(2)}秒、` +
      `わざとのミス ${tl.plan.tFirstWrong.toFixed(2)}秒〜、ゲームオーバー ${tl.plan.tOver.toFixed(2)}秒、点数 ${tl.plan.score}`,
  );
  console.log('撮る範囲（ms）：' + tl.segments.map(([a, b]) => `${a}〜${b}`).join(' / '));
  const vite = await startVite();
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    for (const o of orients) await recordOne(browser, o, tl);
  } finally {
    await browser?.close();
    vite.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

