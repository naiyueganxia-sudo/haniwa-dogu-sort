-- ランキングのデータベース（詳細設計 16.7）
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY,
  run_id     TEXT    NOT NULL UNIQUE,  -- 整理券のランダムID（使い回し防止）
  name       TEXT    NOT NULL,
  score      INTEGER NOT NULL,
  max_combo  INTEGER NOT NULL,
  play_ms    INTEGER NOT NULL,
  rule_ver   INTEGER NOT NULL,
  created_at INTEGER NOT NULL          -- 登録時刻（ミリ秒）
);
CREATE INDEX IF NOT EXISTS scores_rank ON scores (score DESC, created_at ASC);

-- 連続投稿の判定用（接続元はハッシュ。1時間で消す）
CREATE TABLE IF NOT EXISTS rate (
  ip_hash TEXT    NOT NULL,
  at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_ip ON rate (ip_hash, at);
CREATE INDEX IF NOT EXISTS rate_at ON rate (at);
