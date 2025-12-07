import { auth } from '@clerk/nextjs/server';

/**
 * Verify admin access - server-side only
 * Checks against ADMIN_USER_IDS environment variable
 * This cannot be spoofed as it runs server-side
 */
export async function verifyAdminAccess(): Promise<{ isAdmin: boolean; clerkUserId: string | null }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { isAdmin: false, clerkUserId: null };
    }

    // Get admin user IDs from environment variable
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',')
      .map(id => id.trim())
      .filter(Boolean) || [];

    if (adminUserIds.length === 0) {
      console.warn('ADMIN_USER_IDS not configured - no admins allowed');
      return { isAdmin: false, clerkUserId };
    }

    const isAdmin = adminUserIds.includes(clerkUserId);

    return { isAdmin, clerkUserId };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isAdmin: false, clerkUserId: null };
  }
}

/**
 * Require admin access - throws error if not admin
 * Use in API routes
 */
export async function requireAdmin(): Promise<string> {
  const { isAdmin, clerkUserId } = await verifyAdminAccess();

  if (!isAdmin || !clerkUserId) {
    throw new Error('Admin access required');
  }

  return clerkUserId;
}

