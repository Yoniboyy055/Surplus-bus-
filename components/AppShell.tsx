'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Role = 'operator' | 'buyer' | 'referrer' | null;

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const roleNavItems: Record<string, NavItem[]> = {
  operator: [
    { label: 'Dashboard', href: '/operator', icon: <DashboardIcon /> },
    { label: 'Payouts', href: '/operator/payouts', icon: <PayoutIcon /> },
  ],
  buyer: [
    { label: 'Dashboard', href: '/buyer', icon: <DashboardIcon /> },
  ],
  referrer: [
    { label: 'Dashboard', href: '/referrer', icon: <DashboardIcon /> },
  ],
};

const roleBadgeStyles: Record<string, { bg: string; text: string }> = {
  operator: { bg: 'bg-role-operator/20', text: 'text-role-operator' },
  buyer: { bg: 'bg-role-buyer/20', text: 'text-role-buyer' },
  referrer: { bg: 'bg-role-referrer/20', text: 'text-role-referrer' },
};

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function PayoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Determine environment
  const isProduction = process.env.NODE_ENV === 'production';
  const envBadge = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';

  useEffect(() => {
    const fetchUserData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ email: user.email || '' });
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setRole(profile.role as Role);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = role ? roleNavItems[role] || [] : [];
  const badgeStyles = role ? roleBadgeStyles[role] : { bg: 'bg-quantum-700', text: 'text-quantum-300' };

  if (loading) {
    return (
      <div className="min-h-screen bg-quantum-950 flex items-center justify-center">
        <div className="text-quantum-400">Loading...</div>
      </div>
    );
  }

  // If not logged in, just render children (for public pages)
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-quantum-950 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-quantum-900 border-r border-quantum-700 
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-quantum-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <span className="text-cyan-500 font-bold text-lg">SB</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-quantum-50">Surplus Bus</h1>
                <span className={`
                  text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
                  ${isProduction ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}
                `}>
                  {envBadge}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : 'text-quantum-400 hover:text-quantum-50 hover:bg-quantum-800'
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-quantum-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-quantum-400 hover:text-quantum-50 hover:bg-quantum-800 transition-colors"
            >
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-quantum-900/95 backdrop-blur border-b border-quantum-700">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-quantum-400 hover:text-quantum-50 hover:bg-quantum-800"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop: Logo shown only on mobile, spacer on desktop */}
            <div className="hidden lg:block" />

            {/* Right side: User info */}
            <div className="flex items-center gap-4">
              {/* Role Badge */}
              {role && (
                <span className={`
                  px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                  ${badgeStyles.bg} ${badgeStyles.text}
                `}>
                  {role}
                </span>
              )}

              {/* User Email */}
              <span className="text-sm text-quantum-400 hidden sm:block">
                {user.email}
              </span>

              {/* Logout Button (desktop) */}
              <button
                onClick={handleLogout}
                className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-quantum-400 hover:text-quantum-50 hover:bg-quantum-800 transition-colors border border-quantum-700"
              >
                <LogoutIcon />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-quantum-700 py-4 px-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-quantum-500">
            &copy; 2026 Surplus Bus. Operator-verified &middot; Audit-logged &middot; No spam
          </p>
        </footer>
      </div>
    </div>
  );
};

AppShell.displayName = 'AppShell';
