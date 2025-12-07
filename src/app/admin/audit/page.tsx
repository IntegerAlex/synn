import { redirect } from 'next/navigation';
import { verifyAdminAccess } from '@/lib/utils/adminAuth';
import { AuditLogClient } from './AuditLogClient';

// Force dynamic rendering - admin check requires server-side auth
export const dynamic = 'force-dynamic';

/**
 * Server component that verifies admin access before rendering
 * If not admin, redirects to forbidden page
 */
export default async function AuditLogPage() {
  const { isAdmin } = await verifyAdminAccess();

  if (!isAdmin) {
    redirect('/admin/forbidden');
  }

  return <AuditLogClient />;
}
