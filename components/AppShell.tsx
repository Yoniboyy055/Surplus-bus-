'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  DollarSign,
  FileText,
  Send,
  List,
  Link as LinkIcon,
  Users,
  Building2
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import type { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  role: 'operator' | 'referrer' | 'buyer';
};

interface AppShellProps {
  children: React.ReactNode;
  user: User | null;
  profile: Profile | null;
}

export function AppShell({ children, user, profile }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/auth');
      router.refresh();
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'operator':
        return 'info';
      case 'buyer':
        return 'success';
      case 'referrer':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getNavigationItems = () => {
    if (!profile) return [];

    switch (profile.role) {
      case 'operator':
        return [
          { name: 'Dashboard', href: '/operator', icon: <LayoutDashboard size={18} /> },
          { name: 'Payouts', href: '/operator/payouts', icon: <DollarSign size={18} /> },
          { name: 'Audit Logs', href: '/operator', icon: <FileText size={18} /> }, 
        ];
      case 'buyer':
        return [
          { name: 'Dashboard', href: '/buyer', icon: <LayoutDashboard size={18} /> },
          { name: 'Submit Criteria', href: '/buyer', icon: <Send size={18} /> },
          { name: 'Active Deals', href: '/buyer', icon: <List size={18} /> },
        ];
      case 'referrer':
        return [
          { name: 'Dashboard', href: '/referrer', icon: <LayoutDashboard size={18} /> },
          { name: 'Generate Links', href: '/referrer', icon: <LinkIcon size={18} /> },
          { name: 'My Referrals', href: '/referrer', icon: <Users size={18} /> },
        ];
      default:
        return [];
    }
  };

  const navigation = getNavigationItems();
  const isPublic = !user || !profile;

  if (isPublic) {
    return (
      <div className="min-h-screen flex flex-col bg-quantum-950 text-quantum-50">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
          <header className="flex items-center justify-between border-b border-quantum-700 pb-6">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-quantum-200">
               <span>Surplus Bus <span className="text-cyan-500">System</span></span>
            </div>
            <nav className="flex gap-6 text-xs font-medium uppercase tracking-wider text-quantum-400">
              <Link href="/" className="hover:text-quantum-50 transition">Home</Link>
              <Link href="/auth" className="hover:text-quantum-50 transition">Login</Link>
            </nav>
          </header>
          <main className="flex flex-1 flex-col gap-6">{children}</main>
          <footer className="border-t border-quantum-700 pt-6 text-center text-[10px] uppercase tracking-widest text-quantum-500">
            &copy; 2026 Surplus Referral Platform. All rights reserved.
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-quantum-950 text-quantum-50">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-quantum-900 border-r border-quantum-700 transform transition-transform duration-200 ease-in-out
          md:translate-x-0 md:static md:h-auto md:min-h-screen
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-quantum-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-quantum-200">
              <Building2 className="text-cyan-500" size={20} />
              <span className="hidden md:inline">Surplus</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-quantum-400 hover:text-quantum-50"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'text-quantum-400 hover:text-quantum-50 hover:bg-quantum-800'
                    }
                  `}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-quantum-700">
             <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-quantum-500">Environment</span>
                    <Badge variant="default" size="sm" className="text-[10px] py-0 px-2 h-5 bg-quantum-800 text-quantum-300 border border-quantum-700">
                      PRODUCTION
                    </Badge>
                </div>
             </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen transition-all duration-200">
        <header className="sticky top-0 z-30 bg-quantum-950/80 backdrop-blur-sm border-b border-quantum-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-quantum-400 hover:text-quantum-50"
              >
                <Menu size={24} />
              </button>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-quantum-200">{user.email}</span>
                <span className="text-xs text-quantum-500 capitalize">{profile.role}</span>
              </div>
              
              <Badge variant={getRoleBadgeVariant(profile.role)} size="sm" className="capitalize">
                {profile.role}
              </Badge>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="!p-2 text-quantum-400 hover:text-red-400"
                title="Sign Out"
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
