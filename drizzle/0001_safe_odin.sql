DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'repos') THEN
        CREATE TABLE "repos" (
            "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
            "userId" integer NOT NULL,
            "githubRepoId" integer NOT NULL,
            "name" varchar(255) NOT NULL,
            "fullName" varchar(500) NOT NULL,
            "isPrivate" boolean DEFAULT false NOT NULL,
            "ownerId" integer,
            "ownerLogin" varchar(255) NOT NULL,
            "ownerType" varchar(50),
            "description" text,
            "defaultBranch" varchar(255),
            "language" varchar(100),
            "metadata" jsonb,
            "htmlUrl" text,
            "cloneUrl" text,
            "sshUrl" text,
            "starsCount" integer DEFAULT 0,
            "forksCount" integer DEFAULT 0,
            "openIssuesCount" integer DEFAULT 0,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL,
            "syncedAt" timestamp
        );
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique') THEN
        ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";
    END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'clerkUserId') THEN
        ALTER TABLE "users" ADD COLUMN "clerkUserId" varchar(255) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'githubId') THEN
        ALTER TABLE "users" ADD COLUMN "githubId" integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'githubUsername') THEN
        ALTER TABLE "users" ADD COLUMN "githubUsername" varchar(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'githubAccessToken') THEN
        ALTER TABLE "users" ADD COLUMN "githubAccessToken" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'githubRefreshToken') THEN
        ALTER TABLE "users" ADD COLUMN "githubRefreshToken" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'githubTokenExpiresAt') THEN
        ALTER TABLE "users" ADD COLUMN "githubTokenExpiresAt" timestamp;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'oauthMetadata') THEN
        ALTER TABLE "users" ADD COLUMN "oauthMetadata" jsonb;
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repos_userId_users_id_fk') THEN
        ALTER TABLE "repos" ADD CONSTRAINT "repos_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_user_id_idx" ON "repos" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_github_repo_id_idx" ON "repos" USING btree ("githubRepoId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_full_name_idx" ON "repos" USING btree ("fullName");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_user_repo_unique" ON "repos" USING btree ("userId","githubRepoId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_user_id_idx" ON "users" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_github_id_idx" ON "users" USING btree ("githubId");--> statement-breakpoint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age') THEN
        ALTER TABLE "users" DROP COLUMN "age";
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_clerkUserId_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerkUserId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_githubId_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_githubId_unique" UNIQUE("githubId");
    END IF;
END $$;