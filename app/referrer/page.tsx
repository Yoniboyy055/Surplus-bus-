"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";

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
  
  // Use a fallback URL if env is not loaded on client, but prefer window.location.origin
  const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

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

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading Referrer Portal...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-quantum-50">Referrer Portal</h1>
        <Badge variant="warning" className="uppercase tracking-wider">
          {referrerData?.tier || 'Starter'} Tier
        </Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-quantum-400 text-sm font-medium">Points Earned</h3>
          <p className="text-2xl font-bold mt-2 text-quantum-50">{referrerData?.points_closed_paid || 0}</p>
        </Card>
        <Card>
          <h3 className="text-quantum-400 text-sm font-medium">Commission Rate</h3>
          <p className="text-2xl font-bold mt-2 text-quantum-50">{referrerData?.commission_rate || 20}%</p>
        </Card>
        <Card>
          <h3 className="text-quantum-400 text-sm font-medium">Total Referrals</h3>
          <p className="text-2xl font-bold mt-2 text-quantum-50">{referredDeals.length}</p>
        </Card>
      </div>

      <section className="p-6 rounded-xl border border-quantum-700 bg-quantum-900/50 space-y-4">
        <h2 className="text-xl font-semibold text-quantum-50">Referral Links</h2>
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.code} className="flex gap-4">
              <div className="flex-1">
                 <Input 
                   readOnly 
                   value={`${appUrl}/ref/${link.code}`} 
                   fullWidth
                 />
              </div>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(`${appUrl}/ref/${link.code}`);
                  alert("Link copied!");
                }}
                variant="primary"
                icon={<Copy size={16} />}
              >
                Copy
              </Button>
            </div>
          ))}
        </div>
        <Button onClick={generateLink} variant="secondary" fullWidth icon={<Plus size={16} />}>
          Generate New Link
        </Button>
      </section>

      <section className="p-6 rounded-xl border border-quantum-700 bg-quantum-900/50 space-y-4">
        <h2 className="text-xl font-semibold text-quantum-50">Referred Deals</h2>
        <div className="space-y-2">
          {referredDeals.length === 0 ? (
            <p className="text-sm text-quantum-500">No referrals yet.</p>
          ) : (
            referredDeals.map((deal) => (
              <div key={deal.id} className="flex justify-between items-center text-sm border-b border-quantum-700 pb-2">
                <span className="text-quantum-400 font-mono">REF-{deal.id.substring(0, 6).toUpperCase()}</span>
                <Badge variant={deal.status === 'CLOSED_PAID' ? 'success' : 'warning'} size="sm" className="font-bold uppercase text-[10px]">
                  {maskStatus(deal.status)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
