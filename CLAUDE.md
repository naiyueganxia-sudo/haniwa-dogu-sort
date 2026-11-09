# はにわと土偶のエンドレス仕分けゲーム

PC＋スマートフォン向けブラウザゲーム。ベルトコンベアで流れてくる「はにわ」と「土偶」を左右に仕分ける。

- 公開URL：https://naiyueganxia-sudo.github.io/haniwa-dogu-sort/
- **main に push すると GitHub Actions で自動的に本番公開される**（テストが失敗すると公開されない）
- **公開中のゲームには遊んでいる人がいる。main への push やランキングサーバーの本番公開（リリース）は、ユーザーに時期を確認してから行う**（ユーザー指示 2026-11-09）
- ランキング：Cloudflare Workers ＋ D1（`server/`）。ゲーム本体の計算（`src/core`）をサーバーでも使うため、core や `config.ts` の数値を変えたら `RULE_VERSION` を上げてサーバーも更新する（設計書 16.11）

## 作業開始時に読むもの

1. [docs/PROGRESS.md](docs/PROGRESS.md) — 現在の段階、次の作業、保留中の質問
2. [docs/DECISIONS.md](docs/DECISIONS.md) — 確定事項とユーザー判断待ちの一覧
3. [docs/01_requirements.md](docs/01_requirements.md) — 要件定義書（ID：C=確定、U=未確定、P=問題点、I=提案、D=決定事項）
4. 原文：[docs/spec/](docs/spec/)（ユーザーの指示書。編集しない）

## 作業ルール（ユーザー指示）

- 開発は 要件定義 → 詳細設計 → 実装 → 動作確認・調整 の順。**各段階はユーザーの承認を得てから次へ進む。**
- 確定した仕様を独断で変更しない。未確定事項を確定扱いしない。
- 仕様の矛盾や技術的問題は指摘し、重要な判断は選択肢と推奨案を示して承認を得る。
- 各段階の成果物を `docs/` に保存し、決定は DECISIONS.md、進捗と次の作業は PROGRESS.md に必ず反映する。
- 返答とドキュメントは日本語。
