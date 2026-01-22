import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <Lock size={40} className="text-yellow-500" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">403 Forbidden</h1>
          <p className="text-slate-400">
            You do not have permission to access this resource. If you believe this is an error, please contact support.
          </p>
        </div>

        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
