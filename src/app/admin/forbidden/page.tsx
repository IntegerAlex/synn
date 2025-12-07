import { ShieldX } from 'lucide-react';
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-4">Access Forbidden</h1>
        <p className="text-gray-400 mb-6">
          You do not have permission to access this page. Admin access is required.
        </p>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-300 mb-2">
            <strong>Note:</strong> This page is restricted to administrators only.
          </p>
          <p className="text-xs text-gray-400">
            If you believe you should have access, please contact your system administrator.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#238636] hover:bg-[#2ea043] rounded-lg transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

