"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DealKanban } from "@/components/DealKanban";

export default function OperatorPortal() {
  const [user, setUser] = useState<any>(null);
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
      if (profile?.role !== "operator") {
        router.push("/dashboard");
        return;
      }

      // Fetch all active deals for the Kanban board
      const { data: allDeals } = await supabase
        .from('deals')
        .select('*')
        .neq('status', 'CLOSED_PAID')
        .neq('status', 'REJECTED')
        .neq('status', 'LOST')
        .neq('status', 'WITHDRAWN')
        .order('created_at', { ascending: false });
      
      setDeals(allDeals || []);
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const handleStatusChange = async (dealId: string, newStatus: string, message?: string, internalNote?: string) => {
    const res = await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        dealId, 
        status: newStatus, 
        message, 
        internal_note: internalNote 
      })
    });

    if (res.ok) {
      alert("Status updated successfully!");
      // Reload to refresh the board
      window.location.reload();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Operator Portal...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-white">Operator Portal</h1>
        <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium uppercase tracking-wider">
          System Administrator
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
         <DealKanban deals={deals} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}
