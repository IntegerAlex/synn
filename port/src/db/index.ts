import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool
// Note: Make sure your DATABASE_URL includes the database name 'synn'
// Format: postgresql://user:password@host:port/synn?sslmode=require
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

// Initialize Drizzle with the pool and schema
export const db = drizzle({ client: pool, schema });

// Export schema for use in other files
export { schema };
