# Security Implementation

This document describes the security features implemented in Synn.

## 1. Data Encryption

### RSA/AES Hybrid Encryption

The system uses hybrid encryption for sensitive data:

- **RSA 2048+** for key exchange (using `key/public.pem`)
- **AES-256-GCM** for data encryption (symmetric)
- **OAEP padding** with SHA-256 for RSA operations

### Encrypted Fields

The following data is encrypted before storage:

**Activity Logs (`activity_logs` table):**
- `ipAddress`
- `userAgent`
- `metadata`

**API Requests (`api_requests` table):**
- `ipAddress`
- `userAgent`
- `queryParams`
- `metadata`

**Fingerprints (`fingerprints` table):**
- `fingerprintData`
- `ipAddress`
- `userAgent`

**User Tokens (`users` table):**
- `githubAccessToken` (prefixed with `enc:v1:`)
- `githubRefreshToken` (prefixed with `enc:v1:`)

### Key Setup

1. Place your RSA public key at `key/public.pem`
2. Keep your private key secure (never store in repository)
3. Use the private key only for decryption via the API

### Decryption

To decrypt data, use the `/api/admin/decrypt` endpoint with your private key:

```bash
curl -X POST https://your-domain/api/admin/decrypt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-clerk-token>" \
  -d '{
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    "dataType": "all",
    "limit": 100
  }'
```

## 2. Repository Access Validation

The `validateRepoAccess` service checks if users have permission to access repositories:

```typescript
import { validateRepoAccess } from '@/lib/services/repoValidator';

const validation = await validateRepoAccess(clerkUserId, repoFullName);
if (!validation.valid) {
  // Log and optionally deny access
}
```

Note: GitHub API ultimately enforces permissions. This is an additional layer for logging and early detection.

## 3. GDPR Compliance

### Data Export (Right to Data Portability)

**Endpoint:** `GET /api/gdpr/export`

Returns all user data in JSON format:
- User profile
- Repositories
- Fingerprints
- Activity logs
- API requests

### Data Deletion (Right to be Forgotten)

**Endpoint:** `DELETE /api/gdpr/delete`

Deletes all user data:
- Activity logs
- API request logs
- Fingerprints
- Repositories
- User account

**Preview Deletion:** `GET /api/gdpr/delete`

Returns counts of data that will be deleted without performing deletion.

### Data Retention Policies

| Data Type | Retention Period |
|-----------|-----------------|
| Account Data | While account is active |
| Activity Logs | 90 days |
| API Request Logs | 30 days |
| Fingerprint Data | 30 days after last activity |

## 4. Authentication & Authorization

### Protected Routes

The following route patterns require authentication:

- `/api/github/*` - GitHub API interactions
- `/api/repo/*` - Repository operations
- `/api/git/*` - Git data endpoints
- `/api/gdpr/*` - GDPR endpoints
- `/api/admin/*` - Admin/decrypt endpoints

### Webhook Security

- Svix signature verification for Clerk webhooks
- Required headers: `svix-id`, `svix-timestamp`, `svix-signature`
- Webhook secret validated from environment variable

## 5. Token Security

### Storage

GitHub OAuth tokens are:
1. Encrypted using RSA/AES hybrid encryption
2. Prefixed with `enc:v1:` for version identification
3. Stored in the database

### Access

Tokens are retrieved from Clerk on-demand for API calls, not from database:
```typescript
const tokenRes = await client.users.getUserOauthAccessToken(userId, 'github');
```

Database tokens are backup/audit purposes.

## 6. Security Headers

Recommended additional security headers (configure in `next.config.ts` or middleware):

```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];
```

## 7. Logging & Audit

All API requests are logged with:
- User ID (encrypted)
- Fingerprint ID
- Request method and path
- Response status and time
- Error details (if any)
- IP address (encrypted)
- User agent (encrypted)

## 8. Files Structure

```
src/lib/services/
├── encryption.ts        # RSA/AES hybrid encryption
├── tokenEncryption.ts   # GitHub token encryption
├── repoValidator.ts     # Repository access validation
└── activityLogger.ts    # Encrypted activity logging

src/app/api/
├── admin/decrypt/       # Decrypt endpoint
├── gdpr/delete/         # GDPR deletion
└── gdpr/export/         # GDPR export
```

## 9. Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_WEBHOOK_SECRET` - Clerk webhook verification secret

Optional:
- Encryption keys are loaded from filesystem (`key/public.pem`)

## 10. Best Practices

1. **Never commit private keys** to the repository
2. **Rotate tokens** periodically
3. **Monitor logs** for suspicious activity
4. **Regular security audits** of dependencies
5. **Keep dependencies updated** for security patches

