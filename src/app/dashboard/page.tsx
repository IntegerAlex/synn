import { redirect } from 'next/navigation';
import { verifyAdminAccess } from '@/lib/utils/adminAuth';
import { DashboardClient } from './DashboardClient';
import { LogoutButton } from './ui/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { isAdmin } = await verifyAdminAccess();

  if (!isAdmin) {
    redirect('/dashboard/forbidden');
  }

  return (
    <>
      <div className="fixed top-3 right-3 z-30">
        <LogoutButton />
      </div>
      <DashboardClient />
    </>
  );
}

