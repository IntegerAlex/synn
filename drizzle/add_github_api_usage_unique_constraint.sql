-- Add unique constraint to github_api_usage table for ON CONFLICT support
-- This allows atomic upsert operations for usage tracking

-- Drop existing index if it exists (non-unique)
DROP INDEX IF EXISTS "github_api_usage_bucket_idx";

-- Create unique index (constraint) for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS "github_api_usage_bucket_unique" 
ON "github_api_usage" ("clerkUserId", "endpoint", "bucketDate");
