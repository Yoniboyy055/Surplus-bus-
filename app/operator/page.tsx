"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DealKanban } from "@/components/DealKanban";
import { EmptyState } from "@/components/EmptyState";
import { Inbox, Activity, Database, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function OperatorPortal() {
  const [user, setUser] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentHealth, setAgentHealth] = useState<any>(null);
  const [queueCount, setQueueCount] = useState(0);
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

      // Fetch Agent Health
      try {
        const res = await fetch('/api/agents/health');
        if (res.ok) {
          const data = await res.json();
          setAgentHealth(data.health);
        }
      } catch (e) {
        console.error('Failed to fetch agent health', e);
      }

      // Fetch Queue Count
      const { count } = await supabase
        .from('property_candidates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');
      setQueueCount(count || 0);

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
        <div>
           <h1 className="text-2xl font-bold text-white">Operator Portal</h1>
           <div className="flex items-center gap-2 mt-1">
             <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider">
               System Administrator
             </span>
             {agentHealth && (
               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                 agentHealth.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
               }`}>
                 <Activity size={10} /> Agents: {agentHealth.status} ({agentHealth.success_rate}%)
               </span>
             )}
           </div>
        </div>
        
        <div className="flex gap-3">
           <Link 
             href="/operator/properties/review"
             className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition border border-slate-700"
           >
             <Database size={16} />
             Review Queue
             {queueCount > 0 && (
               <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                 {queueCount}
               </span>
             )}
           </Link>
        </div>
      </header>

      {queueCount > 80 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 text-red-400 text-sm">
           <AlertTriangle size={18} />
           <span className="font-bold">Queue Overload:</span>
           <span>{queueCount} candidates pending. Agent scraping paused until queue is cleared.</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {deals.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Active Deals"
            description="The deal pipeline is empty. Review candidates to create new deals."
            actionLabel="Go to Review Queue"
            onAction={() => router.push('/operator/properties/review')}
            className="mt-12"
          />
        ) : (
          <DealKanban deals={deals} onStatusChange={handleStatusChange} />
        )}
      </div>
    </div>
  );
}
