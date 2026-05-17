import { verifyPkToken } from "./pkAuth";

/**
 * Verify admin access - server-side only
 * Primary path: private-key token auth
 */
export async function verifyAdminAccess(): Promise<{
  isAdmin: boolean;
  clerkUserId: string | null;
}> {
  try {
    // 0) Private-key token based admin (preferred if present)
    const pkToken = await verifyPkToken();
    if (pkToken?.valid) {
      return { isAdmin: true, clerkUserId: pkToken.clerkUserId ?? null };
    }
    return { isAdmin: false, clerkUserId: null };
  } catch (error) {
    console.error("Admin verification error:", error);
    return { isAdmin: false, clerkUserId: null };
  }
}

/**
 * Require admin access - throws error if not admin
 * Use in API routes
 */
export async function requireAdmin(): Promise<string> {
  const { isAdmin, clerkUserId } = await verifyAdminAccess();

  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return clerkUserId ?? "pk-admin";
}
