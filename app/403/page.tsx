import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-quantum-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-extrabold text-amber-400 mb-4">403</h1>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-quantum-50 mb-4">Access Forbidden</h2>
        
        {/* Message */}
        <p className="text-quantum-400 mb-8">
          You don&apos;t have permission to access this resource. Your role may not allow access to this page.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-quantum-950 rounded-full font-bold transition"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-full font-medium transition"
          >
            Return Home
          </Link>
        </div>

        {/* Role Info */}
        <div className="mt-12 p-4 bg-quantum-900 rounded-lg border border-quantum-700">
          <p className="text-xs text-quantum-500 uppercase tracking-wider mb-2">Access Levels</p>
          <div className="flex justify-center gap-4 text-xs">
            <span className="px-2 py-1 bg-role-operator/20 text-role-operator rounded">Operator</span>
            <span className="px-2 py-1 bg-role-buyer/20 text-role-buyer rounded">Buyer</span>
            <span className="px-2 py-1 bg-role-referrer/20 text-role-referrer rounded">Referrer</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-quantum-600 mt-8">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
