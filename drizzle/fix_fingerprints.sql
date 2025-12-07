-- Quick fix: Drop and recreate tables with new schema
-- This will preserve data by mapping old fingerprintId to new visitorId

BEGIN;

-- Backup existing data
CREATE TABLE IF NOT EXISTS fingerprints_old_backup AS 
SELECT * FROM fingerprints WHERE EXISTS (SELECT 1 FROM fingerprints LIMIT 1);

-- Drop dependent tables first (due to foreign keys)
DROP TABLE IF EXISTS api_requests CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;

-- Drop and recreate fingerprints table
DROP TABLE IF EXISTS fingerprints CASCADE;

-- Create new fingerprints table
CREATE TABLE "fingerprints" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"userId" integer REFERENCES "users"("id") ON DELETE SET NULL,
	"visitorId" varchar(255) NOT NULL UNIQUE,
	"fingerprintData" jsonb NOT NULL,
	"browser" varchar(255),
	"os" varchar(255),
	"device" varchar(255),
	"ipAddress" varchar(45),
	"country" varchar(100),
	"city" varchar(100),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "fingerprints_user_id_idx" ON "fingerprints"("userId");
CREATE INDEX "fingerprints_visitor_id_idx" ON "fingerprints"("visitorId");
CREATE INDEX "fingerprints_created_at_idx" ON "fingerprints"("createdAt");

-- Migrate data from backup (map fingerprintId -> visitorId)
INSERT INTO "fingerprints" (
	"userId", "visitorId", "fingerprintData", "browser", "os", "device",
	"createdAt", "updatedAt", "lastSeenAt"
)
SELECT 
	"userId",
	"fingerprintId" as "visitorId",
	COALESCE("fingerprintData", '{}'::jsonb),
	"browser",
	"os",
	"device",
	COALESCE("firstSeenAt", now()) as "createdAt",
	"updatedAt",
	"lastSeenAt"
FROM fingerprints_old_backup
ON CONFLICT ("visitorId") DO NOTHING;

-- Create activity_logs table
CREATE TABLE "activity_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"userId" integer REFERENCES "users"("id") ON DELETE SET NULL,
	"fingerprintId" integer REFERENCES "fingerprints"("id") ON DELETE SET NULL,
	"activityType" varchar(100) NOT NULL,
	"category" varchar(50),
	"description" text,
	"repoFullName" varchar(500),
	"requestMethod" varchar(10),
	"requestPath" varchar(500),
	"responseStatus" integer,
	"responseTime" integer,
	"errorCode" varchar(100),
	"errorMessage" text,
	"metadata" jsonb,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("userId");
CREATE INDEX "activity_logs_fingerprint_id_idx" ON "activity_logs"("fingerprintId");
CREATE INDEX "activity_logs_activity_type_idx" ON "activity_logs"("activityType");
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("createdAt");
CREATE INDEX "activity_logs_repo_full_name_idx" ON "activity_logs"("repoFullName");

-- Create api_requests table
CREATE TABLE "api_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"userId" integer REFERENCES "users"("id") ON DELETE SET NULL,
	"fingerprintId" integer REFERENCES "fingerprints"("id") ON DELETE SET NULL,
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
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "api_requests_user_id_idx" ON "api_requests"("userId");
CREATE INDEX "api_requests_fingerprint_id_idx" ON "api_requests"("fingerprintId");
CREATE INDEX "api_requests_path_idx" ON "api_requests"("path");
CREATE INDEX "api_requests_status_code_idx" ON "api_requests"("statusCode");
CREATE INDEX "api_requests_created_at_idx" ON "api_requests"("createdAt");

COMMIT;

