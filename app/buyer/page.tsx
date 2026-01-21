"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function CriteriaForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
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
      alert("Criteria submitted successfully!");
      router.refresh();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-slate-800 bg-slate-900/50">
      <h2 className="text-xl font-semibold">Submit Criteria</h2>
      <select name="property_type" className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-sm" required>
        <option value="">Select Property Type</option>
        <option value="land">Land</option>
        <option value="commercial">Commercial</option>
        <option value="residential">Residential</option>
        <option value="industrial">Industrial</option>
      </select>
      <input name="max_price" type="number" placeholder="Max Price (USD)" className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-sm" required />
      <input name="location" type="text" placeholder="Preferred Location" className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-sm" />
      <textarea name="notes" placeholder="Additional Notes" className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-sm h-24" />
      <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-sm font-medium disabled:opacity-50">
        {loading ? "Submitting..." : "Submit Criteria"}
      </button>
    </form>
  );
}

function DealStatus({ deal }: { deal: any }) {
  const router = useRouter();
  const handleCommit = async () => {
    // 5️⃣ Buyer Commit Confirmation
    const confirmed = window.confirm("By confirming, you agree to the 5% success fee and must upload Proof of Funds within 4 hours.");
    if (!confirmed) return;

    const acceptedFee = window.confirm("Do you explicitly accept the 5% buyer-paid success fee?");
    if (!acceptedFee) {
      alert("You must accept the success fee to commit to a bid.");
      return;
    }

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
      alert(`Error: ${err.error}`);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
      <h2 className="text-xl font-semibold">Active Deal Status</h2>
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-400">Current Status:</span>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
          {deal.status.replace('_', ' ')}
        </span>
      </div>
      {deal.status === 'EXCLUSIVE_WINDOW_ACTIVE' && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-500 font-medium">EXCLUSIVE WINDOW ACTIVE</p>
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
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
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
        .order('created_at', { ascending: false })
        .limit(1);
      
      setDeal(activeDeals?.[0]);
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Portal...</div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Buyer Portal</h1>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium uppercase tracking-wider">
            Track {buyerData?.track || 'B'}
          </div>
          <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium uppercase tracking-wider">
            Reputation: {buyerData?.reputation_score || 50}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {deal ? <DealStatus deal={deal} /> : <CriteriaForm />}
        
        <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-semibold mb-4">Portal Info</h2>
          <div className="space-y-4 text-sm text-slate-400">
            <p>Welcome to your surplus acquisition dashboard. Here you can manage your property criteria and track active matches.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Track A: Priority matching</li>
              <li>Track B: Standard matching</li>
              <li>Reputation affects your track status</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
