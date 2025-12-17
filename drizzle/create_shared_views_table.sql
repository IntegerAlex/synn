-- Create shared_views table for shareable graph views
CREATE TABLE IF NOT EXISTS "shared_views" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "shareId" varchar(32) NOT NULL UNIQUE,
  "userId" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "repoFullName" varchar(500) NOT NULL,
  "viewState" jsonb NOT NULL,
  "title" varchar(255),
  "description" text,
  "expiresAt" timestamp,
  "viewCount" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "lastViewedAt" timestamp
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "shared_views_share_id_idx" ON "shared_views" ("shareId");
CREATE INDEX IF NOT EXISTS "shared_views_user_id_idx" ON "shared_views" ("userId");
CREATE INDEX IF NOT EXISTS "shared_views_created_at_idx" ON "shared_views" ("createdAt");
