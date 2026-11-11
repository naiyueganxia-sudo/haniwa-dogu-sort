-- ルールの版2（難易度の追加。詳細設計 17.5・17.8）。本番のデータベースに1回だけ実行する。
-- 今の記録は自動的に「ふつう」になる（D-35）。今のサーバー（版1）はこの列を使わないので、先に実行しても影響はない。
ALTER TABLE scores ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'normal';
-- 難易度ごとの上位30位（詳細設計 17.11）のための索引
CREATE INDEX IF NOT EXISTS scores_diff_rank ON scores (difficulty, score DESC, created_at ASC);
