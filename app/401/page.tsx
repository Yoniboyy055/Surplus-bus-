import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">401 Unauthorized</h1>
          <p className="text-slate-400">
            Please log in to access this resource. Your session may have expired or you haven&apos;t authenticated yet.
          </p>
        </div>

        <Link 
          href="/auth" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition"
        >
          <ArrowLeft size={18} />
          Return to Login
        </Link>
      </div>
    </div>
  );
}
