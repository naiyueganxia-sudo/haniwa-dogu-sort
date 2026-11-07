# 進捗と次の作業（PROGRESS）

新しいセッションで作業を再開するときは、このファイル → [DECISIONS.md](DECISIONS.md) → [01_requirements.md](01_requirements.md) → [02_design.md](02_design.md) の順に読む。

## 現在の段階

**第3段階：実装 完了・公開済み（2026-11-08）。次は第4段階（実機での動作確認・バランス調整）。**

公開URL：https://naiyueganxia-sudo.github.io/haniwa-dogu-sort/ （リポジトリ：https://github.com/naiyueganxia-sudo/haniwa-dogu-sort 、公開）

| 段階 | 状態 | 成果物 |
|---|---|---|
| 第1段階 要件定義 | 承認済み（2026-11-08） | [01_requirements.md](01_requirements.md) v1.0 |
| 第2段階 詳細設計 | 承認済み（2026-11-08） | [02_design.md](02_design.md) v1.0 |
| 第3段階 実装 | 完了・GitHub Pagesで公開済み | `src/`、`tests/`、`.github/workflows/deploy.yml` |
| 第4段階 動作確認・調整 | 次に着手（ユーザーの実機確認待ち） | — |

## 実装の確認結果（2026-11-08）

- 単体テスト：7ファイル50件すべて成功（`npm test`）。型チェック成功（`npm run typecheck`）。ビルド成功（JS 約44KB・CSS 約8KB、gzip後 約20KB）。
- ブラウザ（アプリ内ブラウザ、Chromium系）での確認：
  - PC配置：キーボードの自動プレイ30秒で17個すべて正解、スコア1,860（=100×9＋120×8。加算後コンボで倍率が決まることを確認）、60fps。
  - スマホ縦（375×812）：タッチ（pointerdown）で操作できる。出土品は約93px。左右10ms差の同時押しは後着が無効になった。
  - スマホ横（812×375）：左右端ボタンの配置。出土品は約53px（要件定義の予測どおり小さい）。
  - 向きの変更で自動一時停止。一時停止中は出土品が隠れる。フォーカス喪失で自動一時停止。
  - コンソールのエラーなし。
- **未確認**：実機（iPhone Safari、Android Chrome、macOS Safari）、Edge、音が鳴るか（アプリ内ブラウザでは聞いていない）、日本語入力オン時のキー操作、ダブルタップ拡大の抑止（実機のみ確認可能）。

## 履歴

| 日付 | 内容 |
|---|---|
| 2026-11-08 | 初版指示書・スマホ追加指示を受領し保存（[spec/](spec/)） |
| 2026-11-08 | 要件定義書 v0.2 提示 → 「推奨案で承認」→ v1.0 |
| 2026-11-08 | 詳細設計書 v0.1 提示 → 「承認して実装へ」→ v1.0 |
| 2026-11-08 | M1（core＋テスト）コミット `659ccfb` |
| 2026-11-08 | M2〜M6（描画・入力・画面・絵・音・デプロイ設定）コミット `0fcf005` |
| 2026-11-08 | ユーザーから「他の人もURLにアクセスすれば遊べる形にしたい」との要望 → 「公開する」で承認。公開リポジトリ作成・push、Pages（GitHub Actions）を有効化。デプロイ成功し、公開URLでタイトル→プレイ開始・コンソールエラーなしを確認 |

## 次の作業

1. 第4段階：ユーザーに実機（iPhone Safari・Android Chrome・PCのEdge等）で遊んでもらい、未確認項目（音、ダブルタップ拡大の抑止、日本語入力オン時のキー操作）と、難易度の数値（設計書 第4章）・見た目の見分けやすさ・操作感の感想を受け取る。
2. 調整した数値は DECISIONS.md に記録し、main に push すると自動で公開URLに反映される（.github/workflows/deploy.yml：テスト→ビルド→Pages）。
3. 軽微：GitHub Actions が Node.js 20 の action（configure-pages@v5、deploy-pages@v4、upload-pages-artifact 内部）に非推奨の警告を出している。動作に問題はない。新しい版が出たら上げる。

## 保留中の質問

なし。

## 開発環境メモ

- 開発サーバー：`npm run dev`（このセッションでは `.claude/launch.json` の `game`。5173が使用中だと別ポート）
- デバッグ：URLに `?debug=1`（境界線と内部値の表示、`window.__game()` で状態参照）、`?seed=数値`
- git：ブランチ `main`、リモート origin = GitHub（公開）。リポジトリ内の user.name=y5268。**main に push すると自動で本番公開される**
