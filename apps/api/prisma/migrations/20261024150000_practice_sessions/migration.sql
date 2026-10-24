CREATE TYPE "PracticeStatus" AS ENUM ('active', 'completed', 'abandoned');

CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  size INTEGER NOT NULL CHECK (size IN (10, 15)),
  undo_used BOOLEAN NOT NULL DEFAULT false,
  topic_id UUID,
  status "PracticeStatus" NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ(3),
  CONSTRAINT practice_sessions_closed_check CHECK (
    (status = 'active' AND closed_at IS NULL) OR
    (status <> 'active' AND closed_at IS NOT NULL)
  )
);
CREATE INDEX practice_sessions_user_id_closed_at_idx ON practice_sessions(user_id, closed_at);
CREATE UNIQUE INDEX practice_sessions_one_active_per_user
  ON practice_sessions(user_id) WHERE status = 'active';

CREATE TABLE practice_items (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL ON UPDATE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0 AND position < 15),
  outcome_id UUID UNIQUE REFERENCES review_outcomes(id) ON DELETE SET NULL ON UPDATE CASCADE,
  outcome_value "ReviewOutcomeValue",
  answered_at TIMESTAMPTZ(3),
  CONSTRAINT practice_items_answer_check CHECK (
    (outcome_value IS NULL AND answered_at IS NULL AND outcome_id IS NULL) OR
    (outcome_value IS NOT NULL AND answered_at IS NOT NULL)
  ),
  UNIQUE(session_id, position),
  UNIQUE(session_id, card_id)
);
