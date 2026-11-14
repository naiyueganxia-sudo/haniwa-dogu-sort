# デモムービーの録画

X に投稿する30秒ほどのデモ動画（縦 1080×1920・横 1920×1080、音なし）を自動で作る道具です。
公開するゲームには含めません。仕組みは詳細設計書 第18章（`docs/02_design.md`）。

## 作り方

```bash
cd demo
npm ci                         # 初回だけ（playwright-core・ffmpeg-static・tsx。約100MB）
npm run record                 # 縦と横の2本（約2分半）
npm run record -- portrait     # 縦だけ（landscape で横だけ）
```

- できた動画：`out/haniwa-demo-portrait.mp4`・`out/haniwa-demo-landscape.mp4`（Git には入れない）
- 確認用の静止画：`out/stills/`
- Windows に入っている Microsoft Edge を画面なしで使います（ブラウザのダウンロードは不要）。

## 仕組み（要点）

- 録画スクリプトが開発用サーバー（ポート 5181）を起動し、`?seed=6`・激むずで遊ぶ。
- 押すタイミングは `plan.ts` がゲーム本体の計算（`src/core`）で先に決める。`npm run plan` で種ごとの見せ場の時刻を一覧にできる。
- ページの時計を止めて 1/30 秒ずつ進め、1コマずつ撮って ffmpeg に流す。途中の場面は撮らずに時計だけ進める（切ってつなぐ）。
- 撮り終えたら、結果画面の点数が予定表と同じかを確かめる（違えば失敗）。
- 開発用サーバー以外への通信はすべて止める（ランキングに記録は入らない）。
- 文字・波紋・キー表示は `overlay.js` を録画のときだけ差し込んで出す。

## 直したいとき

| 直すもの | 場所 |
|---|---|
| 最初の文字・位置・大きさ | `record.ts` の `overlayAt` |
| 最後の文字 | `overlay.js` の `.end` の中身 |
| 場面の長さ・切れ目 | `record.ts` の `buildTimeline`（全体は `VIDEO_SEC`） |
| 押す間合い・わざとミスする時刻 | `plan.ts` の `makePlan` |
| 種 | `record.ts` の `SEED`（`npm run plan` の一覧から選ぶ） |

ゲーム本体（`src/core` や `config.ts`）を変えると、同じ種でも流れが変わります。そのときは撮り直して、切れ目を確かめてください。
