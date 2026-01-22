"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill, maskStatusForReferrer } from "@/components/StatusPill";
import { ConfirmModal } from "@/components/ConfirmModal";

// Get the base URL for referral links - use window.location in browser
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://surplus-bus.vercel.app';
};

export default function ReferrerPortal() {
  const [user, setUser] = useState<any>(null);
  const [referrerData, setReferrerData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [referredDeals, setReferredDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      setUser(user);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "referrer") {
        router.push("/dashboard");
        return;
      }

      const { data: rData } = await supabase.from("referrers").select("*").eq("profile_id", user.id).single();
      setReferrerData(rData);

      const { data: rLinks } = await supabase.from('referral_links').select('code').eq('referrer_profile_id', user.id);
      setLinks(rLinks || []);

      const { data: rDeals } = await supabase
        .from('deals')
        .select('id, status, created_at')
        .eq('referrer_profile_id', user.id)
        .order('created_at', { ascending: false });
      setReferredDeals(rDeals || []);

      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const generateLink = async () => {
    const res = await fetch("/api/referral-links", { method: "POST" });
    if (res.ok) {
      setSuccessMessage("New referral link generated successfully!");
      setShowSuccessModal(true);
      // Refresh links
      if (supabase && user) {
        const { data: rLinks } = await supabase.from('referral_links').select('code').eq('referrer_profile_id', user.id);
        setLinks(rLinks || []);
      }
    } else {
      const err = await res.json();
      setSuccessMessage(`Error: ${err.error}`);
      setShowSuccessModal(true);
    }
  };

  const copyLink = (code: string) => {
    const baseUrl = getBaseUrl();
    navigator.clipboard.writeText(`${baseUrl}/ref/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'elite':
        return 'bg-purple-500/20 text-purple-400';
      case 'proven':
        return 'bg-cyan-500/20 text-cyan-400';
      default:
        return 'bg-amber-500/20 text-amber-400';
    }
  };

  if (loading) return (
    <div className="text-center py-20 text-quantum-500">
      Loading Referrer Portal...
    </div>
  );

  const baseUrl = getBaseUrl();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-quantum-50">Referrer Portal</h1>
          <p className="text-quantum-400 mt-1">Generate links and track your referrals</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${getTierBadgeStyle(referrerData?.tier)}`}>
          {referrerData?.tier || 'Starter'} Tier
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50">
          <h3 className="text-quantum-400 text-sm font-medium">Points Earned</h3>
          <p className="text-3xl font-bold mt-2 text-quantum-50">{referrerData?.points_closed_paid || 0}</p>
        </div>
        <div className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50">
          <h3 className="text-quantum-400 text-sm font-medium">Commission Rate</h3>
          <p className="text-3xl font-bold mt-2 text-cyan-400">{referrerData?.commission_rate || 20}%</p>
        </div>
        <div className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50">
          <h3 className="text-quantum-400 text-sm font-medium">Total Referrals</h3>
          <p className="text-3xl font-bold mt-2 text-quantum-50">{referredDeals.length}</p>
        </div>
      </div>

      {/* Referral Links Section */}
      <section className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-quantum-50">Referral Links</h2>
          <button 
            onClick={generateLink} 
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-quantum-950 rounded-lg transition text-sm font-bold"
          >
            Generate New Link
          </button>
        </div>
        
        {links.length === 0 ? (
          <div className="text-center py-8 text-quantum-500">
            <p>No referral links yet.</p>
            <p className="text-sm mt-1">Click &quot;Generate New Link&quot; to create your first referral link.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.code} className="flex gap-4">
                <input 
                  type="text" 
                  readOnly 
                  value={`${baseUrl}/ref/${link.code}`} 
                  className="flex-1 bg-quantum-900 border border-quantum-700 rounded-lg px-4 py-3 text-sm text-quantum-300 font-mono"
                />
                <button 
                  onClick={() => copyLink(link.code)}
                  className={`px-6 py-2 rounded-lg transition text-sm font-bold min-w-[100px] ${
                    copiedCode === link.code 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-quantum-700 hover:bg-quantum-600 text-quantum-50'
                  }`}
                >
                  {copiedCode === link.code ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Referred Deals Section */}
      <section className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50 space-y-4">
        <h2 className="text-xl font-semibold text-quantum-50">Referred Deals</h2>
        
        {referredDeals.length === 0 ? (
          <div className="text-center py-8 text-quantum-500">
            <p>No referrals yet.</p>
            <p className="text-sm mt-1">Share your referral link to start earning commissions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referredDeals.map((deal) => (
              <div key={deal.id} className="flex justify-between items-center py-3 border-b border-quantum-700/50 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-cyan-400">REF-{deal.id.substring(0, 6).toUpperCase()}</span>
                  <span className="text-xs text-quantum-500">
                    {new Date(deal.created_at).toLocaleDateString()}
                  </span>
                </div>
                <StatusPill status={maskStatusForReferrer(deal.status)} size="sm" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Success/Error Modal */}
      <ConfirmModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        title="Notification"
        message={successMessage}
        confirmText="OK"
        cancelText=""
        variant="info"
      />
    </div>
  );
}
