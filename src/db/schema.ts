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

// User fingerprints table - stores fingerprint-oss data
export const fingerprintsTable = pgTable("fingerprints", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Foreign key to users table (nullable for anonymous users)
  userId: integer().references(() => usersTable.id, { onDelete: "set null" }),
  // Fingerprint data from fingerprint-oss
  visitorId: varchar({ length: 255 }).notNull().unique(),
  // Store all fingerprint data as JSON
  fingerprintData: jsonb().notNull(),
  // Device and browser info
  browser: varchar({ length: 255 }),
  os: varchar({ length: 255 }),
  device: varchar({ length: 255 }),
  // IP address and location
  ipAddress: varchar({ length: 45 }), // IPv6 support
  country: varchar({ length: 100 }),
  city: varchar({ length: 100 }),
  // User agent
  userAgent: text(),
  // Timestamps
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
  lastSeenAt: timestamp().defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("fingerprints_user_id_idx").on(table.userId),
  visitorIdIdx: index("fingerprints_visitor_id_idx").on(table.visitorId),
  createdAtIdx: index("fingerprints_created_at_idx").on(table.createdAt),
}));

// Activity logs table - tracks all user operations
export const activityLogsTable = pgTable("activity_logs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Foreign key to users table (nullable for anonymous users)
  userId: integer().references(() => usersTable.id, { onDelete: "set null" }),
  // Foreign key to fingerprints table
  fingerprintId: integer().references(() => fingerprintsTable.id, { onDelete: "set null" }),
  // Activity type
  activityType: varchar({ length: 100 }).notNull(), // e.g., 'repo_selected', 'branch_viewed', 'commit_viewed', 'api_call'
  // Category
  category: varchar({ length: 50 }), // e.g., 'repository', 'branch', 'commit', 'api', 'error'
  // Description
  description: text(),
  // Repository context
  repoFullName: varchar({ length: 500 }),
  // Request information
  requestMethod: varchar({ length: 10 }), // GET, POST, etc.
  requestPath: varchar({ length: 500 }),
  responseStatus: integer(),
  responseTime: integer(), // milliseconds
  // Error information
  errorCode: varchar({ length: 100 }),
  errorMessage: text(),
  // Additional metadata
  metadata: jsonb(),
  // IP address and location
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  // Timestamps
  createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("activity_logs_user_id_idx").on(table.userId),
  fingerprintIdIdx: index("activity_logs_fingerprint_id_idx").on(table.fingerprintId),
  activityTypeIdx: index("activity_logs_activity_type_idx").on(table.activityType),
  createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
  repoFullNameIdx: index("activity_logs_repo_full_name_idx").on(table.repoFullName),
}));

// API requests table - detailed API call tracking
export const apiRequestsTable = pgTable("api_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Foreign key to users table
  userId: integer().references(() => usersTable.id, { onDelete: "set null" }),
  // Foreign key to fingerprints table
  fingerprintId: integer().references(() => fingerprintsTable.id, { onDelete: "set null" }),
  // Request details
  method: varchar({ length: 10 }).notNull(),
  path: varchar({ length: 500 }).notNull(),
  queryParams: jsonb(),
  // Response details
  statusCode: integer().notNull(),
  responseTime: integer(), // milliseconds
  // Request/Response size
  requestSize: integer(), // bytes
  responseSize: integer(), // bytes
  // Error information
  errorCode: varchar({ length: 100 }),
  errorMessage: text(),
  // Additional metadata
  metadata: jsonb(),
  // IP address
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  // Timestamps
  createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("api_requests_user_id_idx").on(table.userId),
  fingerprintIdIdx: index("api_requests_fingerprint_id_idx").on(table.fingerprintId),
  pathIdx: index("api_requests_path_idx").on(table.path),
  statusCodeIdx: index("api_requests_status_code_idx").on(table.statusCode),
  createdAtIdx: index("api_requests_created_at_idx").on(table.createdAt),
}));

