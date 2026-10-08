-- ============================================================
-- Migration 04: Competitions Enhancements
-- Based on: docs/COMPETITIONS_DATABASE_REQUIREMENTS.md
-- ============================================================

-- 1. Add new columns to competitions table
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'ended', 'archived')),
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS result_visibility BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS final_note TEXT,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER,
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;

-- 2. Leaderboard table (computed after competition ends)
CREATE TABLE IF NOT EXISTS competition_leaderboard (
  competition_id          UUID REFERENCES competitions(id) ON DELETE CASCADE,
  student_id              UUID REFERENCES profiles(id)    ON DELETE CASCADE,
  rank                    INTEGER NOT NULL,
  total_score             INTEGER NOT NULL DEFAULT 0,
  completion_time_seconds INTEGER,
  calculated_at           TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (competition_id, student_id)
);

ALTER TABLE competition_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read leaderboard" ON competition_leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Teachers manage leaderboard" ON competition_leaderboard
  FOR ALL USING (get_user_role() = 'teacher');

-- 3. Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_competition
  ON competition_leaderboard(competition_id, rank);

-- 4. Index for filtering competitions by status
CREATE INDEX IF NOT EXISTS idx_competitions_status
  ON competitions(status);
