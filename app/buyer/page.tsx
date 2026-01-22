"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/Badge";

function CriteriaForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
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
        setSuccess("Criteria submitted successfully!");
        // Optional: Clear form
        // (e.target as HTMLFormElement).reset();
        router.refresh();
        // Force reload to update the deals list in parent
        window.location.reload(); 
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
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-slate-800 bg-slate-900/50">
      <h2 className="text-xl font-semibold text-white">Submit New Criteria</h2>
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {success}
        </div>
      )}
      <select name="property_type" className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required>
        <option value="">Select Property Type</option>
        <option value="land">Land</option>
        <option value="commercial">Commercial</option>
        <option value="residential">Residential</option>
        <option value="industrial">Industrial</option>
      </select>
      <input name="max_price" type="number" placeholder="Max Price (USD)" className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
      <input name="location" type="text" placeholder="Preferred Location" className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      <textarea name="notes" placeholder="Additional Notes" className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none" />
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-semibold disabled:opacity-50 shadow-lg shadow-blue-900/20">
        {loading ? "Submitting..." : "Submit Criteria"}
      </button>
    </form>
  );
}

function DealStatus({ deal }: { deal: any }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleCommit = async () => {
    // 5️⃣ Buyer Commit Confirmation
    const confirmed = window.confirm("By confirming, you agree to the 5% success fee and must upload Proof of Funds within 4 hours.");
    if (!confirmed) return;

    const acceptedFee = window.confirm("Do you explicitly accept the 5% buyer-paid success fee?");
    if (!acceptedFee) {
      setError("You must accept the success fee to commit to a bid.");
      return;
    }

    try {
      const res = await fetch("/api/deals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, action: "COMMIT_TO_BID", acceptedFee: true })
      });

      if (res.ok) {
        alert("Commitment sent! Status updated to BUYER_COMMITTED.");
        router.refresh();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to commit");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
      <div className="flex justify-between items-start">
         <h2 className="text-lg font-semibold text-white">Deal <span className="font-mono text-slate-400">#{deal.id.substring(0,8).toUpperCase()}</span></h2>
         <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
          {deal.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-400">
        <p><strong>Type:</strong> {deal.criteria?.property_type || 'N/A'}</p>
        <p><strong>Max Price:</strong> {deal.criteria?.max_price ? `$${deal.criteria.max_price}` : 'N/A'}</p>
        {deal.criteria?.location && <p><strong>Location:</strong> {deal.criteria.location}</p>}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {deal.status === 'EXCLUSIVE_WINDOW_ACTIVE' && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-500 font-medium flex items-center gap-2">
              <span className="animate-pulse">●</span> EXCLUSIVE WINDOW ACTIVE
            </p>
            <p className="text-sm text-yellow-200 mt-1">Ends: {new Date(deal.exclusive_ends_at).toLocaleString()}</p>
          </div>
          <button onClick={handleCommit} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-bold shadow-lg shadow-green-900/20">
            Commit to Bid (5% Success Fee)
          </button>
        </div>
      )}
    </div>
  );
}

export default function BuyerPortal() {
  const [user, setUser] = useState<any>(null);
  const [buyerData, setBuyerData] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    };
    fetchData();
  }, [router, supabase]);

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Portal...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Buyer Portal</h1>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium uppercase tracking-wider border border-green-500/20">
            Track {buyerData?.track || 'B'}
          </div>
          <div 
             className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium uppercase tracking-wider border border-purple-500/20 cursor-help flex items-center gap-1 group relative"
          >
            Reputation: {buyerData?.reputation_score || 50}
            <HelpCircle size={12} />
            <div className="absolute top-full mt-2 right-0 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-[10px] normal-case tracking-normal shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
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
                <h2 className="text-xl font-semibold text-white">Active Deals ({deals.length})</h2>
              </div>
              <div className="grid gap-4">
                 {deals.map(deal => <DealStatus key={deal.id} deal={deal} />)}
              </div>
            </>
          ) : (
            <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/50">
               <div className="text-4xl mb-4">📭</div>
               <h3 className="text-lg font-medium text-white mb-2">No Active Deals</h3>
               <p className="text-slate-400 text-sm">Submit your criteria to get matched with surplus properties.</p>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
           <CriteriaForm />
           
           <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4">Portal Info</h2>
              <div className="space-y-4 text-sm text-slate-400">
                <p>Welcome to your surplus acquisition dashboard. Here you can manage your property criteria and track active matches.</p>
                <ul className="list-disc list-inside space-y-1 marker:text-blue-500">
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
