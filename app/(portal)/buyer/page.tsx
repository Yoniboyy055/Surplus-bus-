"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Deal {
  id: string;
  status: string;
  criteria: any;
  property_type: string;
  max_price: number;
  exclusive_ends_at: string | null;
  created_at: string;
}

function CriteriaForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const data = {
      property_type: formData.get("property_type"),
      max_price: formData.get("max_price"),
      criteria: {
        location: formData.get("location"),
        notes: formData.get("notes")
      }
    };

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 1500);
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to submit criteria');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-quantum-700 bg-quantum-800/50">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-quantum-50">Submit New Criteria</h2>
        {success && (
          <span className="text-sm text-green-400 font-medium">Submitted!</span>
        )}
      </div>
      
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-2">Property Type</label>
          <select 
            name="property_type" 
            className="w-full p-3 rounded-lg bg-quantum-900 border border-quantum-700 text-quantum-50 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            required
          >
            <option value="">Select Property Type</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
            <option value="industrial">Industrial</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-2">Max Price (USD)</label>
          <input 
            name="max_price" 
            type="number" 
            placeholder="Enter maximum budget" 
            className="w-full p-3 rounded-lg bg-quantum-900 border border-quantum-700 text-quantum-50 text-sm placeholder-quantum-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            required 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-2">Preferred Location</label>
          <input 
            name="location" 
            type="text" 
            placeholder="City, State, or Region" 
            className="w-full p-3 rounded-lg bg-quantum-900 border border-quantum-700 text-quantum-50 text-sm placeholder-quantum-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-2">Additional Notes</label>
          <textarea 
            name="notes" 
            placeholder="Any specific requirements or preferences..." 
            className="w-full p-3 rounded-lg bg-quantum-900 border border-quantum-700 text-quantum-50 text-sm placeholder-quantum-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent h-24 resize-none"
          />
        </div>
      </div>
      
      <button 
        type="submit" 
        disabled={loading} 
        className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-quantum-950 rounded-lg transition text-sm font-bold disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Criteria"}
      </button>
    </form>
  );
}

function DealCard({ deal, onCommit }: { deal: Deal; onCommit: (deal: Deal) => void }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isExclusiveActive = deal.status === 'EXCLUSIVE_WINDOW_ACTIVE';
  const exclusiveEndsAt = deal.exclusive_ends_at ? new Date(deal.exclusive_ends_at) : null;
  const now = new Date();
  const timeRemaining = exclusiveEndsAt ? Math.max(0, exclusiveEndsAt.getTime() - now.getTime()) : 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-xs text-quantum-500">DEAL-{deal.id.substring(0, 8).toUpperCase()}</span>
          <div className="mt-2">
            <StatusPill status={deal.status} />
          </div>
        </div>
        <span className="text-xs text-quantum-500">
          {new Date(deal.created_at).toLocaleDateString()}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-quantum-700/50">
        <div>
          <p className="text-xs text-quantum-500 uppercase tracking-wider">Property Type</p>
          <p className="text-sm font-medium text-quantum-50 capitalize mt-1">{deal.property_type}</p>
        </div>
        <div>
          <p className="text-xs text-quantum-500 uppercase tracking-wider">Max Budget</p>
          <p className="text-sm font-medium text-cyan-400 mt-1">{formatCurrency(deal.max_price)}</p>
        </div>
      </div>
      
      {deal.criteria?.location && (
        <div>
          <p className="text-xs text-quantum-500 uppercase tracking-wider">Location</p>
          <p className="text-sm text-quantum-300 mt-1">{deal.criteria.location}</p>
        </div>
      )}

      {isExclusiveActive && (
        <div className="space-y-4 pt-4 border-t border-quantum-700/50">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Exclusive Window Active</p>
                <p className="text-sm text-amber-200 mt-1">
                  Time Remaining: {hoursRemaining}h {minutesRemaining}m
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-quantum-500">Ends At</p>
                <p className="text-sm text-quantum-300">{exclusiveEndsAt?.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onCommit(deal)}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-bold shadow-lg shadow-green-900/20"
          >
            Commit to Bid (5% Success Fee)
          </button>
        </div>
      )}
    </div>
  );
}

function ReputationTooltip({ score }: { score: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-cyan-400';
    if (score >= 30) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`px-4 py-2 bg-purple-500/20 rounded-full text-sm font-bold uppercase tracking-wider ${getScoreColor()} flex items-center gap-2`}
      >
        Reputation: {score}
        <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-quantum-800 border border-quantum-700 rounded-lg shadow-lg z-50">
          <h4 className="font-bold text-quantum-50 mb-2">Reputation Score</h4>
          <p className="text-sm text-quantum-400 mb-3">
            Your reputation score affects your buyer track and deal priority.
          </p>
          <ul className="text-xs text-quantum-500 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              80-100: Track A (Priority)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
              50-79: Track A/B (Standard)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              30-49: Track B (Limited)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              0-29: Restricted
            </li>
          </ul>
          <p className="text-xs text-quantum-500 mt-3 pt-3 border-t border-quantum-700">
            Score improves with successful closes. Withdrawals or missed commitments reduce it.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BuyerPortal() {
  const [user, setUser] = useState<any>(null);
  const [buyerData, setBuyerData] = useState<any>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const fetchDeals = async () => {
    if (!supabase || !user) return;
    
    const { data: activeDeals } = await supabase
      .from('deals')
      .select('*')
      .eq('buyer_profile_id', user.id)
      .not('status', 'in', '("CLOSED_PAID","LOST","WITHDRAWN","REJECTED")')
      .order('created_at', { ascending: false });
    
    setDeals(activeDeals || []);
  };

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
      if (profile?.role !== "buyer") {
        router.push("/dashboard");
        return;
      }

      const { data: bData } = await supabase.from("buyers").select("*").eq("profile_id", user.id).single();
      setBuyerData(bData);

      const { data: activeDeals } = await supabase
        .from('deals')
        .select('*')
        .eq('buyer_profile_id', user.id)
        .not('status', 'in', '("CLOSED_PAID","LOST","WITHDRAWN","REJECTED")')
        .order('created_at', { ascending: false });
      
      setDeals(activeDeals || []);
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const handleCommitClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setCommitModalOpen(true);
  };

  const handleCommitConfirm = async () => {
    if (!selectedDeal) return;
    
    setIsCommitting(true);
    const res = await fetch("/api/deals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: selectedDeal.id, action: "COMMIT_TO_BID", acceptedFee: true })
    });

    if (res.ok) {
      setCommitModalOpen(false);
      setSelectedDeal(null);
      // Refresh deals
      if (supabase && user) {
        const { data: activeDeals } = await supabase
          .from('deals')
          .select('*')
          .eq('buyer_profile_id', user.id)
          .not('status', 'in', '("CLOSED_PAID","LOST","WITHDRAWN","REJECTED")')
          .order('created_at', { ascending: false });
        setDeals(activeDeals || []);
      }
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
    setIsCommitting(false);
  };

  if (loading) return (
    <div className="text-center py-20 text-quantum-500">
      Loading Buyer Portal...
    </div>
  );

  const getTrackBadgeStyle = (track: string) => {
    return track === 'A' 
      ? 'bg-green-500/20 text-green-400' 
      : 'bg-cyan-500/20 text-cyan-400';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-quantum-50">Buyer Portal</h1>
          <p className="text-quantum-400 mt-1">Manage your criteria and track active deals</p>
        </div>
        <div className="flex gap-3">
          <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${getTrackBadgeStyle(buyerData?.track || 'B')}`}>
            Track {buyerData?.track || 'B'}
          </div>
          <ReputationTooltip score={buyerData?.reputation_score || 50} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit Criteria Form */}
        <div className="lg:col-span-1">
          <CriteriaForm onSuccess={fetchDeals} />
        </div>

        {/* Active Deals List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-quantum-50">Active Deals ({deals.length})</h2>
          </div>

          {deals.length === 0 ? (
            <div className="p-8 rounded-xl border border-quantum-700 bg-quantum-800/50 text-center">
              <div className="w-16 h-16 mx-auto bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-500 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-quantum-50 mb-2">No Active Deals</h3>
              <p className="text-quantum-400 text-sm mb-4">
                Submit your property criteria to get matched with qualified surplus opportunities.
              </p>
              <p className="text-quantum-500 text-xs">
                Once submitted, our operators will qualify your request and match you with suitable properties.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deals.map((deal) => (
                <DealCard 
                  key={deal.id} 
                  deal={deal} 
                  onCommit={handleCommitClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commit Confirmation Modal */}
      <ConfirmModal
        isOpen={commitModalOpen}
        onClose={() => {
          setCommitModalOpen(false);
          setSelectedDeal(null);
        }}
        onConfirm={handleCommitConfirm}
        title="Commit to Bid"
        message={`By confirming, you agree to the following:

• 5% buyer-paid success fee on deal close
• Proof of Funds required within 4 hours
• Commitment is binding and logged in the audit trail

Failure to complete may affect your reputation score and buyer track.`}
        confirmText="I Accept & Commit"
        cancelText="Cancel"
        variant="warning"
        loading={isCommitting}
      />
    </div>
  );
}
