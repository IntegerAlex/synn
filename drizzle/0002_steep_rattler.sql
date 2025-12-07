CREATE TABLE "activity_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer,
	"sessionId" varchar(255),
	"fingerprintId" varchar(255),
	"activityType" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"repoId" integer,
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
--> statement-breakpoint
CREATE TABLE "fingerprints" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fingerprints_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fingerprintId" varchar(255) NOT NULL,
	"userId" integer,
	"fingerprintData" jsonb NOT NULL,
	"browser" varchar(100),
	"browserVersion" varchar(50),
	"os" varchar(100),
	"osVersion" varchar(50),
	"device" varchar(100),
	"screenWidth" integer,
	"screenHeight" integer,
	"screenColorDepth" integer,
	"timezone" varchar(100),
	"language" varchar(50),
	"isVpn" boolean,
	"isProxy" boolean,
	"isIncognito" boolean,
	"hasAdBlocker" boolean,
	"isBot" boolean,
	"canvasHash" varchar(255),
	"webglHash" varchar(255),
	"metadata" jsonb,
	"firstSeenAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fingerprints_fingerprintId_unique" UNIQUE("fingerprintId")
);
--> statement-breakpoint
CREATE TABLE "repo_interactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repo_interactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"repoId" integer NOT NULL,
	"interactionType" varchar(50) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer,
	"sessionId" varchar(255) NOT NULL,
	"fingerprintId" varchar(255),
	"ipAddress" varchar(45),
	"userAgent" text,
	"referrer" text,
	"metadata" jsonb,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	CONSTRAINT "sessions_sessionId_unique" UNIQUE("sessionId")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_repoId_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."repos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fingerprints" ADD CONSTRAINT "fingerprints_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_interactions" ADD CONSTRAINT "repo_interactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_interactions" ADD CONSTRAINT "repo_interactions_repoId_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "activity_logs_session_id_idx" ON "activity_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "activity_logs_fingerprint_id_idx" ON "activity_logs" USING btree ("fingerprintId");--> statement-breakpoint
CREATE INDEX "activity_logs_activity_type_idx" ON "activity_logs" USING btree ("activityType");--> statement-breakpoint
CREATE INDEX "activity_logs_category_idx" ON "activity_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "activity_logs_repo_id_idx" ON "activity_logs" USING btree ("repoId");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "fingerprints_fingerprint_id_idx" ON "fingerprints" USING btree ("fingerprintId");--> statement-breakpoint
CREATE INDEX "fingerprints_user_id_idx" ON "fingerprints" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "fingerprints_last_seen_at_idx" ON "fingerprints" USING btree ("lastSeenAt");--> statement-breakpoint
CREATE INDEX "repo_interactions_user_id_idx" ON "repo_interactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "repo_interactions_repo_id_idx" ON "repo_interactions" USING btree ("repoId");--> statement-breakpoint
CREATE INDEX "repo_interactions_interaction_type_idx" ON "repo_interactions" USING btree ("interactionType");--> statement-breakpoint
CREATE INDEX "repo_interactions_created_at_idx" ON "repo_interactions" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "repo_interactions_user_repo_idx" ON "repo_interactions" USING btree ("userId","repoId");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sessions_session_id_idx" ON "sessions" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "sessions_fingerprint_id_idx" ON "sessions" USING btree ("fingerprintId");--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "sessions" USING btree ("startedAt");