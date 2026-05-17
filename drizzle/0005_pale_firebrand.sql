ALTER TABLE "roasts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "roasts" CASCADE;--> statement-breakpoint
DROP INDEX "github_api_usage_bucket_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "github_api_usage_bucket_unique" ON "github_api_usage" USING btree ("clerkUserId","endpoint","bucketDate");