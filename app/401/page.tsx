import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-quantum-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-extrabold text-red-400 mb-4">401</h1>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-quantum-50 mb-4">Authentication Required</h2>
        
        {/* Message */}
        <p className="text-quantum-400 mb-8">
          You need to be logged in to access this page. Please sign in with your email to continue.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-quantum-950 rounded-full font-bold transition"
          >
            Sign In
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-full font-medium transition"
          >
            Return Home
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-quantum-600 mt-12">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
