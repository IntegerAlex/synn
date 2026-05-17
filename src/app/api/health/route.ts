import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

/**
 * Health check endpoint
 * Returns 200 if the application and database are healthy
 * Returns 503 if there are issues
 *
 * Used by monitoring services, load balancers, and deployment platforms
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<
    string,
    { status: "healthy" | "unhealthy"; message?: string; duration?: number }
  > = {};

  // Check database connectivity
  try {
    const dbStartTime = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbDuration = Date.now() - dbStartTime;
    checks.database = {
      status: "healthy",
      duration: dbDuration,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      message:
        error instanceof Error ? error.message : "Database connection failed",
    };
  }

  // Check environment variables (basic check)
  try {
    const requiredVars = ["DATABASE_URL", "CLERK_WEBHOOK_SECRET"];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      checks.environment = {
        status: "unhealthy",
        message: `Missing required environment variables: ${missingVars.join(", ")}`,
      };
    } else {
      checks.environment = {
        status: "healthy",
      };
    }
  } catch (error) {
    checks.environment = {
      status: "unhealthy",
      message:
        error instanceof Error ? error.message : "Environment check failed",
    };
  }

  const totalDuration = Date.now() - startTime;
  const allHealthy = Object.values(checks).every(
    (check) => check.status === "healthy",
  );
  const status = allHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
      duration: totalDuration,
    },
    { status },
  );
}
