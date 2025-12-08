CREATE TABLE IF NOT EXISTS "api_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer,
	"fingerprintId" integer,
	"method" varchar(10) NOT NULL,
	"path" varchar(500) NOT NULL,
	"queryParams" jsonb,
	"statusCode" integer NOT NULL,
	"responseTime" integer,
	"requestSize" integer,
	"responseSize" integer,
	"errorCode" varchar(100),
	"errorMessage" text,
	"metadata" jsonb,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "commits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contributions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contributions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"repoId" integer,
	"contributionDate" timestamp NOT NULL,
	"commitCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repo_interactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "repo_interactions" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "fingerprints" DROP CONSTRAINT "fingerprints_fingerprintId_unique";--> statement-breakpoint
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_repoId_repos_id_fk";
--> statement-breakpoint
DROP INDEX "activity_logs_session_id_idx";--> statement-breakpoint
DROP INDEX "activity_logs_category_idx";--> statement-breakpoint
DROP INDEX "activity_logs_repo_id_idx";--> statement-breakpoint
DROP INDEX "fingerprints_fingerprint_id_idx";--> statement-breakpoint
DROP INDEX "fingerprints_last_seen_at_idx";--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "fingerprintId" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "ipAddress" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "fingerprints" ALTER COLUMN "browser" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "fingerprints" ALTER COLUMN "os" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "fingerprints" ALTER COLUMN "device" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "fingerprints" ADD COLUMN "visitorId" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "fingerprints" ADD COLUMN "ipAddress" text;--> statement-breakpoint
ALTER TABLE "fingerprints" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "fingerprints" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "fingerprints" ADD COLUMN "userAgent" text;--> statement-breakpoint
ALTER TABLE "fingerprints" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_fingerprintId_fingerprints_id_fk" FOREIGN KEY ("fingerprintId") REFERENCES "public"."fingerprints"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commits" ADD CONSTRAINT "commits_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commits" ADD CONSTRAINT "commits_repoId_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contributions" ADD CONSTRAINT "contributions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contributions" ADD CONSTRAINT "contributions_repoId_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_requests_user_id_idx" ON "api_requests" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_requests_fingerprint_id_idx" ON "api_requests" USING btree ("fingerprintId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_requests_path_idx" ON "api_requests" USING btree ("path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_requests_status_code_idx" ON "api_requests" USING btree ("statusCode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_requests_created_at_idx" ON "api_requests" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commits_user_id_idx" ON "commits" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commits_repo_id_idx" ON "commits" USING btree ("repoId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commits_hash_idx" ON "commits" USING btree ("hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commits_commit_date_idx" ON "commits" USING btree ("commitDate");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commits_user_repo_hash_unique" ON "commits" USING btree ("userId","repoId","hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contributions_user_id_idx" ON "contributions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contributions_repo_id_idx" ON "contributions" USING btree ("repoId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contributions_contribution_date_idx" ON "contributions" USING btree ("contributionDate");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contributions_user_repo_date_unique" ON "contributions" USING btree ("userId","repoId","contributionDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contributions_user_date_idx" ON "contributions" USING btree ("userId","contributionDate");--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_fingerprintId_fingerprints_id_fk" FOREIGN KEY ("fingerprintId") REFERENCES "public"."fingerprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_repo_full_name_idx" ON "activity_logs" USING btree ("repoFullName");--> statement-breakpoint
CREATE INDEX "fingerprints_visitor_id_idx" ON "fingerprints" USING btree ("visitorId");--> statement-breakpoint
CREATE INDEX "fingerprints_created_at_idx" ON "fingerprints" USING btree ("createdAt");--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "sessionId";--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "repoId";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "fingerprintId";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "browserVersion";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "osVersion";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "screenWidth";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "screenHeight";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "screenColorDepth";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "timezone";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "language";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "isVpn";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "isProxy";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "isIncognito";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "hasAdBlocker";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "isBot";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "canvasHash";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "webglHash";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "fingerprints" DROP COLUMN "firstSeenAt";--> statement-breakpoint
ALTER TABLE "fingerprints" ADD CONSTRAINT "fingerprints_visitorId_unique" UNIQUE("visitorId");