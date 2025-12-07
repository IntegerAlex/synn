import { integer, pgTable, varchar, timestamp, text, boolean, jsonb, index } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Clerk user ID (primary identifier)
  clerkUserId: varchar({ length: 255 }).notNull().unique(),
  // Basic user info
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }),
  // GitHub OAuth data
  githubId: integer().unique(),
  githubUsername: varchar({ length: 255 }),
  githubAccessToken: text(), // Encrypted/stored securely
  githubRefreshToken: text(),
  githubTokenExpiresAt: timestamp(),
  // Store all OAuth metadata as JSON
  oauthMetadata: jsonb(),
  // Timestamps
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
}, (table) => ({
  clerkUserIdIdx: index("users_clerk_user_id_idx").on(table.clerkUserId),
  githubIdIdx: index("users_github_id_idx").on(table.githubId),
}));

export const reposTable = pgTable("repos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Foreign key to users table
  userId: integer().notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  // GitHub repository identifiers
  githubRepoId: integer().notNull(),
  name: varchar({ length: 255 }).notNull(),
  fullName: varchar({ length: 500 }).notNull(), // owner/repo-name
  // Repository visibility
  isPrivate: boolean().notNull().default(false),
  // Owner information
  ownerId: integer(),
  ownerLogin: varchar({ length: 255 }).notNull(),
  ownerType: varchar({ length: 50 }), // User or Organization
  // Repository details
  description: text(),
  defaultBranch: varchar({ length: 255 }),
  language: varchar({ length: 100 }),
  // Repository metadata (stored as JSON for flexibility)
  metadata: jsonb(),
  // GitHub API URLs and additional info
  htmlUrl: text(),
  cloneUrl: text(),
  sshUrl: text(),
  // Repository stats
  starsCount: integer().default(0),
  forksCount: integer().default(0),
  openIssuesCount: integer().default(0),
  // Timestamps
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
  syncedAt: timestamp(), // Last time we synced from GitHub
}, (table) => ({
  userIdIdx: index("repos_user_id_idx").on(table.userId),
  githubRepoIdIdx: index("repos_github_repo_id_idx").on(table.githubRepoId),
  fullNameIdx: index("repos_full_name_idx").on(table.fullName),
  // Composite unique constraint: same repo can belong to different users
  userRepoUnique: index("repos_user_repo_unique").on(table.userId, table.githubRepoId),
}));

