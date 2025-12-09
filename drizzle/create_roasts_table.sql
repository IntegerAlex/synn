-- Safe creation of roasts table (idempotent)
-- Run manually if migrations are out of sync

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roasts') THEN
    CREATE TABLE roasts (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS roasts_user_id_unique ON roasts("userId");
  END IF;
END $$;

