-- Migration script to update fingerprints table structure
-- This handles the transition from old schema to new schema

BEGIN;

-- Step 1: Create a backup of existing data (if any)
CREATE TABLE IF NOT EXISTS fingerprints_backup AS 
SELECT * FROM fingerprints;

-- Step 2: Drop the old table and constraints
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS api_requests CASCADE;
DROP TABLE IF EXISTS fingerprints CASCADE;

-- Step 3: Create new fingerprints table with correct schema
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

-- Step 4: Create indexes
CREATE INDEX "fingerprints_user_id_idx" ON "fingerprints"("userId");
CREATE INDEX "fingerprints_visitor_id_idx" ON "fingerprints"("visitorId");
CREATE INDEX "fingerprints_created_at_idx" ON "fingerprints"("createdAt");

-- Step 5: Migrate data from backup if it exists
-- Map old fingerprintId to new visitorId
INSERT INTO "fingerprints" (
	"userId",
	"visitorId",
	"fingerprintData",
	"browser",
	"os",
	"device",
	"ipAddress",
	"country",
	"city",
	"userAgent",
	"createdAt",
	"updatedAt",
	"lastSeenAt"
)
SELECT 
	"userId",
	"fingerprintId" as "visitorId", -- Map old fingerprintId to visitorId
	COALESCE("fingerprintData", '{}'::jsonb) as "fingerprintData",
	"browser",
	"os",
	"device",
	NULL as "ipAddress", -- Not in old schema
	NULL as "country", -- Not in old schema
	NULL as "city", -- Not in old schema
	NULL as "userAgent", -- Not in old schema
	COALESCE("firstSeenAt", now()) as "createdAt",
	"updatedAt",
	"lastSeenAt"
FROM fingerprints_backup
ON CONFLICT ("visitorId") DO NOTHING;

-- Step 6: Create activity_logs table
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

-- Step 7: Create api_requests table
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

