"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, HelpCircle, Inbox, Send } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";

function CriteriaForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      property_type: formData.get("property_type"),
      max_price: formData.get("max_price"),
      criteria: {
        location: formData.get("location"),
        notes: formData.get("notes")
      }
    };

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        onSuccess();
        // Reset form
        (e.target as HTMLFormElement).reset();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to submit criteria");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-quantum-700 bg-quantum-900/50">
      <h2 className="text-xl font-semibold text-quantum-50">Submit New Criteria</h2>
      {error && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-semibold text-quantum-200 mb-3">
          Property Type
        </label>
        <div className="relative">
          <select 
            name="property_type" 
            className="w-full bg-quantum-900 border border-quantum-700 rounded-md px-4 py-3 text-quantum-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 appearance-none" 
            required
          >
            <option value="">Select Property Type</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
            <option value="industrial">Industrial</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-quantum-500">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      <Input name="max_price" type="number" placeholder="Max Price (USD)" label="Maximum Price" required />
      <Input name="location" type="text" placeholder="Preferred Location" label="Target Location" />
      
      <div>
        <label className="block text-sm font-semibold text-quantum-200 mb-3">
          Additional Notes
        </label>
        <textarea 
          name="notes" 
          placeholder="Specific requirements or preferences..." 
          className="w-full bg-quantum-900 border border-quantum-700 rounded-md px-4 py-3 text-quantum-50 placeholder-quantum-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 h-24" 
        />
      </div>

      <Button type="submit" loading={loading} fullWidth className="shadow-lg shadow-cyan-900/20">
        Submit Criteria
      </Button>
    </form>
  );
}

function DealStatus({ deal, onUpdate }: { deal: any, onUpdate: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCommit = async () => {
    setShowFeeModal(true);
  };

  const onFeeAccepted = () => {
    setShowFeeModal(false);
    setShowConfirmModal(true);
  }

  const performCommit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, action: "COMMIT_TO_BID", acceptedFee: true })
      });

      if (res.ok) {
        onUpdate();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to commit");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  }

  return (
    <>
      <div className="p-6 rounded-xl border border-quantum-700 bg-quantum-900/50 space-y-4">
        <div className="flex justify-between items-start">
           <h2 className="text-lg font-semibold text-quantum-50">Deal <span className="font-mono text-quantum-400">#{deal.id.substring(0,8).toUpperCase()}</span></h2>
           <StatusPill status={deal.status} size="sm" />
        </div>

        <div className="space-y-2 text-sm text-quantum-400">
          <p><strong>Type:</strong> {deal.criteria?.property_type || 'N/A'}</p>
          <p><strong>Max Price:</strong> {deal.criteria?.max_price ? `$${deal.criteria.max_price}` : 'N/A'}</p>
          {deal.criteria?.location && <p><strong>Location:</strong> {deal.criteria.location}</p>}
        </div>

        {error && (
          <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {deal.status === 'EXCLUSIVE_WINDOW_ACTIVE' && (
          <div className="space-y-4 pt-4 border-t border-quantum-700">
            <div className="p-3 bg-accent-warning/10 border border-accent-warning/20 rounded-lg">
              <p className="text-xs text-accent-warning font-medium flex items-center gap-2">
                <span className="animate-pulse">●</span> EXCLUSIVE WINDOW ACTIVE
              </p>
              <p className="text-sm text-accent-warning mt-1">Ends: {new Date(deal.exclusive_ends_at).toLocaleString()}</p>
            </div>
            <Button onClick={handleCommit} fullWidth variant="primary" className="font-bold shadow-lg shadow-green-900/20">
              Commit to Bid (5% Success Fee)
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showFeeModal}
        onClose={() => setShowFeeModal(false)}
        onConfirm={onFeeAccepted}
        title="Accept Success Fee"
        message="Do you explicitly accept the 5% buyer-paid success fee upon closing?"
        confirmText="I Accept"
        variant="info"
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={performCommit}
        title="Confirm Commitment"
        message="By confirming, you commit to placing a bid and must upload Proof of Funds within 4 hours. Failure to do so may impact your reputation score."
        confirmText="Commit to Deal"
        loading={loading}
      />
    </>
  );
}

export default function BuyerPortal() {
  const [user, setUser] = useState<any>(null);
  const [buyerData, setBuyerData] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const fetchData = useCallback(async () => {
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
      .neq('status', 'CLOSED_PAID')
      .neq('status', 'LOST')
      .neq('status', 'WITHDRAWN')
      .order('created_at', { ascending: false });
    
    setDeals(activeDeals || []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCriteriaSuccess = () => {
    setToast({ message: "Criteria submitted successfully!", type: "success" });
    router.refresh(); // Soft refresh
    // Optionally refetch local data if router.refresh() isn't enough for client-side state
    fetchData(); 
  };

  const handleDealUpdate = () => {
    setToast({ message: "Commitment sent! Status updated.", type: "success" });
    router.refresh();
    fetchData();
  };

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading Portal...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-quantum-50">Buyer Portal</h1>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-accent-success/20 text-accent-success rounded-full text-xs font-medium uppercase tracking-wider border border-accent-success/20">
            Track {buyerData?.track || 'B'}
          </div>
          <div 
             className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium uppercase tracking-wider border border-purple-500/20 cursor-help flex items-center gap-1 group relative"
          >
            Reputation: {buyerData?.reputation_score || 50}
            <HelpCircle size={12} />
            <div className="absolute top-full mt-2 right-0 w-64 p-3 bg-quantum-900 border border-quantum-700 rounded-lg text-quantum-300 text-[10px] normal-case tracking-normal shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
              Score based on deal closure rate, speed of proof-of-funds submission, and adherence to mandate terms. Higher scores unlock Track A priority access.
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {deals.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-quantum-50">Active Deals ({deals.length})</h2>
              </div>
              <div className="grid gap-4">
                 {deals.map(deal => (
                   <DealStatus 
                     key={deal.id} 
                     deal={deal} 
                     onUpdate={handleDealUpdate}
                   />
                 ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No Active Deals"
              description="Submit your criteria to get matched with surplus properties."
            />
          )}
        </div>
        
        <div className="space-y-6">
           <CriteriaForm onSuccess={handleCriteriaSuccess} />
           
           <section className="p-6 rounded-xl border border-quantum-700 bg-quantum-900/50">
              <h2 className="text-lg font-semibold text-quantum-50 mb-4">Portal Info</h2>
              <div className="space-y-4 text-sm text-quantum-400">
                <p>Welcome to your surplus acquisition dashboard. Here you can manage your property criteria and track active matches.</p>
                <ul className="list-disc list-inside space-y-1 marker:text-cyan-500">
                  <li>Track A: Priority matching</li>
                  <li>Track B: Standard matching</li>
                  <li>Reputation affects your track status</li>
                </ul>
              </div>
            </section>
        </div>
      </div>
    </div>
  );
}
