import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-quantum-950">
      {/* Public Header */}
      <header className="border-b border-quantum-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span className="text-cyan-500 font-bold text-lg">SB</span>
            </div>
            <span className="text-lg font-bold text-quantum-50">Surplus Bus</span>
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/auth" className="text-quantum-400 hover:text-quantum-50 transition">
              Sign In
            </Link>
          </nav>
        </div>
      </header>
      
      {/* Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-quantum-700 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-quantum-500">
            &copy; 2026 Surplus Bus. Operator-verified &middot; Audit-logged &middot; No spam
          </p>
        </div>
      </footer>
    </div>
  );
}
