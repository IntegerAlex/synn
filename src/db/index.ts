import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '@/lib/env';

// Create connection pool
// Note: Make sure your DATABASE_URL includes the database name 'synn'
// Format: postgresql://user:password@host:port/synn?sslmode=require
// DATABASE_URL is validated at startup via env.ts
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Initialize Drizzle with the pool and schema
export const db = drizzle({ client: pool, schema });

// Export schema for use in other files
export { schema };
