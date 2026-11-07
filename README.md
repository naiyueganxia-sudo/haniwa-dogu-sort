# はにわと土偶の仕分けゲーム

ベルトコンベアで流れてくる「はにわ」と「土偶」を左右に仕分けるエンドレス型のブラウザゲーム。PC（キーボード）とスマホ（タッチ）に対応。

## 遊び方

| | はにわ（左） | 土偶（右） | 一時停止 |
|---|---|---|---|
| PC | A / ← | D / → | Space / Esc |
| スマホ | 左のボタン | 右のボタン | 右上の ⏸ |

ミス（まちがい・見逃し）3回で終了。連続正解でコンボ倍率が上がる。

## 開発

```bash
npm install
npm run dev      # 開発サーバー（http://localhost:5173）。同じWi-Fiのスマホからは表示される Network のURLで
npm test         # 単体テスト
npm run build    # 公開用ファイルを dist/ に出力
npm run preview  # dist/ を確認
```

- `?debug=1`：判定エリアの境界線と内部の値を表示
- `?seed=123`：乱数を固定

設計資料は [docs/](docs/)（[PROGRESS.md](docs/PROGRESS.md) から読む）。
