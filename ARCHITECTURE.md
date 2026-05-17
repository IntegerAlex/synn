# Synn Architecture Documentation

**Last Updated:** December 2024  
**Version:** 1.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Data Flow](#data-flow)
5. [Component Structure](#component-structure)
6. [State Management](#state-management)
7. [API Design](#api-design)
8. [Database Schema](#database-schema)
9. [Security Architecture](#security-architecture)
10. [File Structure](#file-structure)

---

## System Overview

Synn is a Git visualization tool that allows developers to explore their GitHub repository history through an interactive graph interface. The application follows a modern, service-oriented architecture with clear separation of concerns.

### Key Features

- **Git Repository Visualization**: Interactive graph showing commits, branches, and merges
- **GitHub Integration**: OAuth-based authentication and repository access
- **User Profiles**: Contribution graphs and user statistics
- **Real-time Sync**: Background synchronization of repository data
- **Security**: End-to-end encryption for sensitive data, GDPR compliance

### Architecture Principles

1. **Modular Design**: Service-oriented backend with clear boundaries
2. **Type Safety**: Strict TypeScript throughout
3. **Reactive State**: TanStack Query for data fetching and caching
4. **Security First**: Encryption, rate limiting, and proper authentication
5. **Developer Experience**: Clear structure, comprehensive error handling

---

## Technology Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **State Management**: 
  - Redux Toolkit (Zustand) for global UI state
  - TanStack Query (React Query) for server state
- **Graph Visualization**: 
  - Cytoscape.js (primary)
  - Custom Canvas renderer (GraphRenderer)
- **Animations**: GSAP
- **Authentication**: Clerk

### Backend

- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Encryption**: RSA + AES hybrid encryption

### Infrastructure

- **Deployment**: Vercel (or similar)
- **Database**: PostgreSQL (managed service)
- **Authentication**: Clerk
- **Logging**: Structured logging (custom logger)

---

## Architecture Patterns

### 1. Service-Oriented Architecture

The backend is organized into modular services:

```
src/lib/services/
├── githubApi.ts          # GitHub API client
├── githubSync.ts         # Repository synchronization
├── contributionSync.ts   # Contribution data sync
├── tokenEncryption.ts    # Token encryption/decryption
├── encryption.ts         # General encryption utilities
├── repoValidator.ts      # Repository access validation
└── activityLogger.ts     # Activity logging
```

Each service has a single responsibility and can be tested independently.

### 2. Repository Pattern

Database access is abstracted through Drizzle ORM:

```typescript
// Example: User repository access
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

const user = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.clerkUserId, clerkUserId))
  .limit(1);
```

### 3. API Route Pattern

All API routes follow a consistent structure:

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Rate limiting
    const rateLimitResult = checkRateLimit(identifier);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // 3. Input validation (if needed)
    // 4. Business logic
    // 5. Response
    return NextResponse.json({ data });
  } catch (error) {
    // Error handling
    return formatErrorResponse(error);
  }
}
```

---

## Data Flow

### 1. User Authentication Flow

```
User → Clerk OAuth → Webhook → Database
                      ↓
              GitHub Token Sync
                      ↓
              Repository Access
```

1. User authenticates via Clerk
2. Clerk webhook (`/api/webhook`) receives user creation event
3. System fetches GitHub OAuth token from Clerk
4. Token is encrypted and stored in database
5. User repositories are synced

### 2. Repository Visualization Flow

```
User Selects Repo → RepoSelector Component
                         ↓
              TanStack Query Hook (useGraph)
                         ↓
              API Route (/api/git/graph)
                         ↓
              GitService (lib/git/GitService.ts)
                         ↓
              Database Query (commits, branches)
                         ↓
              Graph Data Transformation
                         ↓
              Graph Component (CytoscapeGraph/CanvasGraph)
```

### 3. Contribution Sync Flow

```
Webhook Trigger → /api/contributions/sync
                         ↓
              contributionSync Service
                         ↓
              GitHub API Calls (commits, PRs)
                         ↓
              Database Updates (batch processing)
                         ↓
              Cache Invalidation
```

---

## Component Structure

### Frontend Component Hierarchy

```
RootLayout
├── ErrorBoundary (catches all errors)
├── Providers
│   ├── QueryProvider (TanStack Query)
│   └── AuthProvider (Clerk)
└── Pages
    ├── Landing Page (/)
    │   ├── Header
    │   ├── HeroSection
    │   ├── FeaturesSection
    │   ├── CTASection
    │   └── Footer
    │
    ├── App Page (/app)
    │   ├── Header
    │   ├── Sidebar (branches)
    │   ├── Graph (CytoscapeGraph or CanvasGraph)
    │   ├── CommitDetails (right panel)
    │   └── Footer
    │
    └── Profile Page (/profile)
        ├── GitHubContributionGraph
        ├── ShareModal
        └── SharePopover
```

### Component Categories

1. **Layout Components** (`components/layout/`)
   - Header, Footer, Sidebar
   - Shared UI elements

2. **Graph Components** (`components/graph/`)
   - CytoscapeGraph, CanvasGraph
   - CommitTooltip, CommitActivityChart
   - Graph visualization logic

3. **Landing Components** (`components/landing/`)
   - Marketing pages
   - Hero, Features, CTA sections

4. **Profile Components** (`components/profile/`)
   - User profile views
   - Contribution graphs
   - Share functionality

5. **UI Components** (`components/ui/`)
   - Reusable UI primitives (Button, etc.)

---

## State Management

### Global UI State (Zustand)

Located in `src/store/useAppStore.ts`:

```typescript
interface AppState {
  repoInfo: RepoInfo | null;
  selectedCommitHash: string | null;
  theme: string;
  // Actions
  setRepoInfo: (info: RepoInfo) => void;
  setSelectedCommitHash: (hash: string | null) => void;
  setTheme: (theme: string) => void;
}
```

**Usage**: UI state that needs to be shared across components (selected commit, theme, etc.)

### Server State (TanStack Query)

Used for all data fetching:

```typescript
// Example: Fetching graph data
const { data, isLoading, error } = useQuery({
  queryKey: ['graph', repoInfo?.owner, repoInfo?.name],
  queryFn: () => fetchGraphData(repoInfo),
  enabled: !!repoInfo,
});
```

**Benefits**:
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling

### Local Component State

Use React `useState` for component-specific state that doesn't need to be shared.

---

## API Design

### RESTful Endpoints

All API routes follow REST conventions:

#### Git Operations

- `GET /api/git/graph` - Get repository graph data
- `GET /api/git/repo` - Get repository information
- `GET /api/git/branches` - List branches
- `GET /api/git/commits` - List commits
- `GET /api/git/commits/[hash]` - Get commit details
- `POST /api/git/checkout` - Checkout branch/commit
- `GET /api/git/search` - Search commits

#### GitHub Integration

- `GET /api/github/repos` - List user repositories
- `POST /api/webhook` - Clerk webhook handler

#### Contributions

- `GET /api/contributions` - Get user contributions
- `POST /api/contributions/sync` - Sync contributions

#### User Profile

- `GET /api/contributions` - Get user contribution data

#### Admin

- `POST /api/admin/decrypt` - Decrypt sensitive data (admin only)
- `GET /api/admin/logs` - View activity logs (admin only)

#### GDPR

- `POST /api/gdpr/export` - Export user data
- `POST /api/gdpr/delete` - Delete user data

#### Health

- `GET /api/health` - Health check endpoint

### Request/Response Format

**Success Response**:
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-12-01T00:00:00Z"
  }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Authentication

All protected routes require Clerk authentication:

```typescript
const { userId } = await auth();
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Rate Limiting

Rate limiting is implemented on all API routes:

- General API: 100 requests/minute
- Auth endpoints: 10 requests/5 minutes
- Webhook: 30 requests/minute
- Admin: 5 requests/15 minutes
- GitHub API: 50 requests/minute

---

## Database Schema

### Core Tables

#### `users`
- `id` (serial, primary key)
- `clerkUserId` (text, unique)
- `githubUsername` (text)
- `encryptedGithubToken` (text)
- `encryptedRefreshToken` (text)
- `createdAt`, `updatedAt`

#### `repos`
- `id` (serial, primary key)
- `userId` (foreign key → users.id)
- `owner` (text)
- `name` (text)
- `defaultBranch` (text)
- `createdAt`, `updatedAt`

#### `commits`
- `id` (serial, primary key)
- `repoId` (foreign key → repos.id)
- `hash` (text)
- `message` (text)
- `author` (text)
- `timestamp` (timestamp)
- `branch` (text)
- `parentHashes` (text[]) - Array of parent commit hashes

#### `contributions`
- `id` (serial, primary key)
- `userId` (foreign key → users.id)
- `date` (date)
- `count` (integer)
- `repoId` (foreign key → repos.id)

#### `activity_logs`
- `id` (serial, primary key)
- `userId` (encrypted)
- `fingerprintId` (encrypted)
- `method` (text)
- `path` (text)
- `status` (integer)
- `duration` (integer)
- `ipAddress` (encrypted)
- `userAgent` (encrypted)
- `createdAt`

### Relationships

```
users (1) ──< (many) repos
repos (1) ──< (many) commits
users (1) ──< (many) contributions
```

---

## Security Architecture

### Authentication & Authorization

1. **Clerk Authentication**
   - OAuth-based authentication
   - JWT tokens for session management
   - Webhook verification using Svix

2. **Admin Access**
   - Admin user IDs configured via `ADMIN_USER_IDS` env var
   - Server-side verification only

### Data Encryption

1. **GitHub Tokens**
   - Encrypted using RSA + AES hybrid encryption
   - Private key stored securely (not in repository)
   - Public key used for encryption

2. **Sensitive Data**
   - User IDs, IP addresses, user agents encrypted in activity logs
   - GDPR-compliant data handling

### Security Headers

Configured in `next.config.ts`:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### Rate Limiting

In-memory rate limiting on all API routes to prevent abuse.

### Input Validation

- Zod schemas for all API inputs
- Type-safe validation at runtime
- Environment variable validation at startup

---

## File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── app/               # Main application page
│   ├── profile/           # User profile page
│   └── layout.tsx         # Root layout
│
├── components/            # React components
│   ├── graph/             # Graph visualization components
│   ├── landing/          # Landing page components
│   ├── layout/            # Layout components
│   ├── profile/           # Profile components
│   └── ui/                # UI primitives
│
├── db/                    # Database configuration
│   ├── index.ts          # Drizzle setup
│   └── schema.ts         # Database schema
│
├── hooks/                 # Custom React hooks
│   ├── useGitData.ts     # Graph data hook
│   └── useDocumentTitle.ts
│
├── lib/                   # Library code
│   ├── api/              # API client utilities
│   ├── git/              # Git service
│   ├── graph/            # Graph rendering logic
│   ├── services/         # Business logic services
│   └── utils/            # Utility functions
│
└── store/                 # State management
    └── useAppStore.ts    # Zustand store
```

---

## Key Design Decisions

### 1. Why TanStack Query over useEffect?

- **Automatic caching**: Reduces unnecessary API calls
- **Background refetching**: Keeps data fresh
- **Error handling**: Built-in retry logic
- **Loading states**: Automatic loading/error states
- **Project rule**: Aligns with project architecture guidelines

### 2. Why Zustand over Redux?

- **Simplicity**: Less boilerplate
- **TypeScript**: Better type inference
- **Performance**: Lightweight and fast
- **Use case**: UI state doesn't need complex middleware

### 3. Why Drizzle ORM?

- **Type safety**: Full TypeScript support
- **Performance**: Lightweight, no runtime overhead
- **SQL-like**: Familiar query syntax
- **Migration support**: Built-in migration system

### 4. Why Hybrid Encryption?

- **RSA**: Secure key exchange
- **AES**: Fast bulk encryption
- **Best of both**: Security + performance

---

## Development Workflow

### Adding a New Feature

1. **Create API Route** (`src/app/api/[feature]/route.ts`)
   - Add authentication check
   - Add rate limiting
   - Add input validation (Zod)
   - Implement business logic
   - Return formatted response

2. **Create Service** (`src/lib/services/[feature].ts`)
   - Extract business logic
   - Make it testable
   - Add error handling

3. **Create Frontend Hook** (`src/hooks/use[Feature].ts`)
   - Use TanStack Query
   - Handle loading/error states

4. **Create Component** (`src/components/[Feature].tsx`)
   - Use the hook
   - Handle UI states
   - Add error boundaries if needed

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in required variables
3. Environment variables are validated at startup via `src/lib/env.ts`

### Database Migrations

```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit push
```

---

## Performance Considerations

### Frontend

- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component with proper sizing
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components

### Backend

- **Database Indexing**: Indexes on frequently queried columns
- **Batch Processing**: Bulk operations for sync
- **Caching**: TanStack Query cache for API responses
- **Rate Limiting**: Prevents abuse and overload

---

## Monitoring & Observability

### Health Checks

- `GET /api/health` - Returns application and database health status

### Logging

- Structured logging via `src/lib/utils/logger.ts`
- Activity logging for all API requests
- Error tracking (ready for integration with Sentry)

### Metrics

- Response times logged in activity logs
- Database query performance tracked
- Rate limit statistics available

---

## Future Improvements

1. **Testing**: Add unit and integration tests
2. **API Documentation**: OpenAPI/Swagger documentation
3. **Performance Monitoring**: APM integration
4. **Caching**: Redis for distributed caching
5. **WebSockets**: Real-time updates for sync status

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Clerk Authentication](https://clerk.com/docs)

---

**Note**: This architecture document is a living document and should be updated as the application evolves.
