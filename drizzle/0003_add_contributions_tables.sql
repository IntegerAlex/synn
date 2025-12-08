-- Migration: Add commits and contributions tables
-- Run this migration to create the tables for contribution tracking

CREATE TABLE IF NOT EXISTS "commits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"userId" integer NOT NULL,
	"repoId" integer NOT NULL,
	"hash" varchar(40) NOT NULL,
	"shortHash" varchar(7) NOT NULL,
	"message" text NOT NULL,
	"authorName" varchar(255) NOT NULL,
	"authorEmail" varchar(255) NOT NULL,
	"commitDate" timestamp NOT NULL,
	"branch" varchar(255),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"syncedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "contributions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"userId" integer NOT NULL,
	"repoId" integer,
	"contributionDate" timestamp NOT NULL,
	"commitCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys
DO $$ BEGIN
 ALTER TABLE "commits" ADD CONSTRAINT "commits_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "commits" ADD CONSTRAINT "commits_repoId_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "contributions" ADD CONSTRAINT "contributions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "contributions" ADD CONSTRAINT "contributions_repoId_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "commits_user_id_idx" ON "commits" ("userId");
CREATE INDEX IF NOT EXISTS "commits_repo_id_idx" ON "commits" ("repoId");
CREATE INDEX IF NOT EXISTS "commits_hash_idx" ON "commits" ("hash");
CREATE INDEX IF NOT EXISTS "commits_commit_date_idx" ON "commits" ("commitDate");
CREATE UNIQUE INDEX IF NOT EXISTS "commits_user_repo_hash_unique" ON "commits" ("userId", "repoId", "hash");

CREATE INDEX IF NOT EXISTS "contributions_user_id_idx" ON "contributions" ("userId");
CREATE INDEX IF NOT EXISTS "contributions_repo_id_idx" ON "contributions" ("repoId");
CREATE INDEX IF NOT EXISTS "contributions_contribution_date_idx" ON "contributions" ("contributionDate");
CREATE UNIQUE INDEX IF NOT EXISTS "contributions_user_repo_date_unique" ON "contributions" ("userId", "repoId", "contributionDate");
CREATE INDEX IF NOT EXISTS "contributions_user_date_idx" ON "contributions" ("userId", "contributionDate");
