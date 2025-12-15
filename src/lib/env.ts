/**
 * Environment variable validation using Zod
 * Validates all environment variables at startup to fail fast
 */

import { z } from 'zod';
import { logger } from './utils/logger';

// Schema for required environment variables (production-critical)
const requiredEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
});

// Schema for optional environment variables with defaults
const optionalEnvSchema = z.object({
  // Clerk (optional in development, required in production)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
  
  // Admin Configuration
  ADMIN_USER_IDS: z.string().optional(),
  
  // Azure OpenAI (for Roast Feature) - optional
  AZURE_PHI_4_ENDPOINT: z.string().url().optional().or(z.literal('')),
  AZURE_PHI_4_API_KEY: z.string().optional(),
  AZURE_PHI_4_DEPLOYMENT: z.string().default('phi-4'),
  // Legacy support
  AZURE_PHI_4: z.string().optional(),
  
  // Encryption (Optional - for Production)
  ENCRYPTION_PUBLIC_KEY_PATH: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Performance Tuning
  COMMIT_BATCH_SIZE: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return 100; // default
    }
    return parsed;
  }).pipe(z.number().int().positive()).default(100),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

// Combined schema
const envSchema = requiredEnvSchema.merge(optionalEnvSchema);

// Type inference
export type Env = z.infer<typeof envSchema>;

// Parse and validate environment variables (lazy validation)
let validatedEnv: Env | null = null;
let validationError: Error | null = null;

function validateEnv(): Env {
  // Skip validation during build time (Next.js build process)
  // Validation will happen at runtime when env is first accessed
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    // During build, return a partial env object with defaults
    // This allows the build to complete, but validation will happen at runtime
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
      AZURE_PHI_4_ENDPOINT: process.env.AZURE_PHI_4_ENDPOINT,
      AZURE_PHI_4_API_KEY: process.env.AZURE_PHI_4_API_KEY,
      AZURE_PHI_4_DEPLOYMENT: process.env.AZURE_PHI_4_DEPLOYMENT || 'phi-4',
      AZURE_PHI_4: process.env.AZURE_PHI_4,
      ENCRYPTION_PUBLIC_KEY_PATH: process.env.ENCRYPTION_PUBLIC_KEY_PATH,
      LOG_LEVEL: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      COMMIT_BATCH_SIZE: process.env.COMMIT_BATCH_SIZE ? parseInt(process.env.COMMIT_BATCH_SIZE, 10) : 100,
      NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined,
    } as Env;
  }

  // Runtime validation
  try {
    const result = envSchema.parse(process.env);
    
    // Validate Clerk keys in production
    if (process.env.NODE_ENV === 'production') {
      const missing: string[] = [];
      if (!result.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) missing.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
      if (!result.CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
      if (!result.CLERK_WEBHOOK_SECRET) missing.push('CLERK_WEBHOOK_SECRET');

      if (missing.length > 0) {
        logger.error('Clerk keys required in production', { missing });
        console.error('\n❌ Missing Clerk authentication keys in production environment.\n');
        console.error(`Please set: ${missing.join(', ')}.\n`);
        process.exit(1);
      }
    } else {
      // In development, warn instead of exit for missing Clerk secrets
      const missingDev: string[] = [];
      if (!result.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) missingDev.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
      if (!result.CLERK_SECRET_KEY) missingDev.push('CLERK_SECRET_KEY');
      if (!result.CLERK_WEBHOOK_SECRET) missingDev.push('CLERK_WEBHOOK_SECRET');
      if (missingDev.length > 0) {
        logger.warn('Clerk env vars missing (development only)', { missingDev });
      }
    }

    // Log successful validation (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Environment variables validated successfully');
    }

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Invalid environment variables:', error);
      console.error('\n❌ Environment variable validation failed:\n');
      error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        console.error(`  ✗ ${path}: ${issue.message}`);
      });
      console.error('\nPlease check your .env file and ensure all required variables are set.\n');
      console.error('See .env.example for reference.\n');
      validationError = error;
      process.exit(1);
    }
    throw error;
  }
}

// Lazy getter - validates on first access
export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    if (!validatedEnv) {
      validatedEnv = validateEnv();
    }
    if (validationError) {
      throw validationError;
    }
    return validatedEnv[prop as keyof Env];
  },
}) as Env;
