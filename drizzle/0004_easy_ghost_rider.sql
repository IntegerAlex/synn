CREATE TABLE "github_api_usage" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "github_api_usage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clerkUserId" varchar(255),
	"userId" integer,
	"endpoint" varchar(255) NOT NULL,
	"statusCode" integer,
	"bucketDate" timestamp DEFAULT now() NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roasts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roasts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shared_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shareId" varchar(32) NOT NULL,
	"userId" integer,
	"repoFullName" varchar(500) NOT NULL,
	"viewState" jsonb NOT NULL,
	"title" varchar(255),
	"description" text,
	"expiresAt" timestamp,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastViewedAt" timestamp,
	CONSTRAINT "shared_views_shareId_unique" UNIQUE("shareId")
);
--> statement-breakpoint
ALTER TABLE "github_api_usage" ADD CONSTRAINT "github_api_usage_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roasts" ADD CONSTRAINT "roasts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_views" ADD CONSTRAINT "shared_views_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_api_usage_bucket_idx" ON "github_api_usage" USING btree ("clerkUserId","endpoint","bucketDate");--> statement-breakpoint
CREATE INDEX "github_api_usage_endpoint_idx" ON "github_api_usage" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "github_api_usage_user_idx" ON "github_api_usage" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "roasts_user_id_unique" ON "roasts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "shared_views_share_id_idx" ON "shared_views" USING btree ("shareId");--> statement-breakpoint
CREATE INDEX "shared_views_user_id_idx" ON "shared_views" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "shared_views_created_at_idx" ON "shared_views" USING btree ("createdAt");