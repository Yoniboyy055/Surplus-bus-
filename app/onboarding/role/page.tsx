'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'referrer' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelection = async (role: 'buyer' | 'referrer') => {
    setIsLoading(true);
    setError('');

    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase client unavailable');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  const roles = [
    {
      id: 'buyer',
      title: 'Strategic Buyer',
      subtitle: 'Acquirer',
      description: 'I am here to commit to deals and acquire assets.',
      icon: '🎯',
      color: 'text-cyan-500',
    },
    {
      id: 'referrer',
      title: 'Intel Referrer',
      subtitle: 'Originator',
      description: 'I am here to surface deals and earn commission.',
      icon: '⚡',
      color: 'text-yellow-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-quantum-950 via-quantum-900 to-quantum-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="text-cyan-500 text-5xl mb-3">🔐</div>
            <p className="text-xs font-semibold text-cyan-500 tracking-widest">ROLE SELECTION</p>
          </div>
          <h1 className="text-4xl font-bold text-quantum-50 mb-3">
            Welcome to <span className="text-cyan-500">Surplus Bus</span>
          </h1>
          <p className="text-quantum-400">
            Select your primary role. This defines your portal access and system permissions.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-8 p-4 rounded-lg border border-accent-warning/40 bg-accent-warning/10 text-accent-warning text-sm">
          ⚠ Your role is permanent. Choose carefully.
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id as 'buyer' | 'referrer')}
              disabled={isLoading}
              className={`p-8 rounded-lg border-2 transition-all duration-200 text-left group ${
                selectedRole === role.id
                  ? 'border-cyan-500 bg-quantum-800/80 shadow-glow-cyan'
                  : 'border-quantum-700 bg-quantum-800 hover:border-quantum-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="text-4xl">{role.icon}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-quantum-50 mb-2">{role.title}</h3>
                  <p className="text-xs font-semibold text-quantum-500 tracking-widest">{role.subtitle}</p>
                </div>
                {selectedRole === role.id && (
                  <div className="text-cyan-500 text-2xl">✓</div>
                )}
              </div>
              <p className="text-quantum-400 text-sm">{role.description}</p>
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-lg border border-accent-danger/40 bg-accent-danger/10 text-accent-danger text-sm">
            ✕ {error}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={() => selectedRole && handleRoleSelection(selectedRole)}
          disabled={!selectedRole || isLoading}
          className="w-full inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-quantum-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 text-quantum-950 hover:bg-cyan-400 active:scale-95 px-4 py-3 text-base"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Confirming...
            </>
          ) : (
            <>
              Confirm Role & Enter Portal
              <span className="ml-3">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
