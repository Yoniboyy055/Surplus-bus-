"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const maskStatus = (status: string) => {
  const terminalStatuses = ['CLOSED_PAID', 'LOST', 'WITHDRAWN'];
  if (terminalStatuses.includes(status)) {
    return status.replace('_', ' ');
  }
  return "Active Deal"; // 7️⃣ Referrer Privacy: Mask all non-terminal statuses
};

export default function ReferrerPortal() {
  const [user, setUser] = useState<any>(null);
  const [referrerData, setReferrerData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [referredDeals, setReferredDeals] = useState<any[]>([]);
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
      alert("New referral link generated!");
      window.location.reload();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Referrer Portal...</div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Referrer Portal</h1>
        <div className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium uppercase tracking-wider">
          {referrerData?.tier || 'Starter'} Tier
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Points Earned</h3>
          <p className="text-2xl font-bold mt-2">{referrerData?.points_closed_paid || 0}</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Commission Rate</h3>
          <p className="text-2xl font-bold mt-2">{referrerData?.commission_rate || 20}%</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Total Referrals</h3>
          <p className="text-2xl font-bold mt-2">{referredDeals.length}</p>
        </div>
      </div>

      <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
        <h2 className="text-xl font-semibold">Referral Links</h2>
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.code} className="flex gap-4">
              <input 
                type="text" 
                readOnly 
                value={`https://surplus-bus.com/ref/${link.code}`} 
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-400"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`https://surplus-bus.com/ref/${link.code}`);
                  alert("Link copied!");
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-sm font-medium"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
        <button onClick={generateLink} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm font-medium">
          Generate New Link
        </button>
      </section>

      <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
        <h2 className="text-xl font-semibold">Referred Deals</h2>
        <div className="space-y-2">
          {referredDeals.length === 0 ? (
            <p className="text-sm text-slate-500">No referrals yet.</p>
          ) : (
            referredDeals.map((deal) => (
              <div key={deal.id} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-mono">REF-{deal.id.substring(0, 6).toUpperCase()}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${deal.status === 'CLOSED_PAID' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {maskStatus(deal.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
