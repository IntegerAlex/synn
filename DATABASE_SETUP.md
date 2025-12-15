# Database Setup Instructions

## Issue
You have an existing `fingerprints` table with an old schema that conflicts with the new schema. The old table has `fingerprintId` (varchar) but the new schema uses `visitorId` (varchar).

## Solution

**Option 1: Use the migration script (Recommended)**

Run the migration script to drop and recreate the tables with the correct schema:

```bash
node scripts/migrate-db.js
```

Or if you have `psql` installed:

```bash
psql $DATABASE_URL -f drizzle/fix_fingerprints.sql
```

**Option 2: Manual migration with Drizzle (if script fails)**

If the script doesn't work, you can manually drop the old tables first:

```sql
-- Connect to your database and run:
DROP TABLE IF EXISTS api_requests CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS fingerprints CASCADE;
```

Then run:

```bash
pnpm db:push
```

## What the Migration Does

1. **Backs up** existing fingerprint data to `fingerprints_old_backup`
2. **Drops** old tables (`fingerprints`, `activity_logs`, `api_requests`)
3. **Creates** new tables with the correct schema
4. **Migrates** data from backup (maps `fingerprintId` → `visitorId`)

## What's Fixed

1. **Error Handling**: The code now gracefully handles missing tables - it won't crash if tables don't exist
2. **Fingerprint Storage**: Returns a warning instead of error if table doesn't exist
3. **API Routes**: All routes continue to work even if fingerprint tracking tables are missing

## After Migration

Once you run the migration, the following will work:
- ✅ Fingerprint data will be stored in `fingerprints` table
- ✅ All user activities will be logged in `activity_logs` table
- ✅ All API requests will be tracked in `api_requests` table

## Current Status

The application will work without these tables, but fingerprint tracking and activity logging will be disabled until you run the migration.

