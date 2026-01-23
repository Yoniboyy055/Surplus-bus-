"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DealKanban } from "@/components/DealKanban";
import { EmptyState } from "@/components/EmptyState";
import { Inbox, Activity, Database, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Toast } from "@/components/Toast";

export default function OperatorPortal() {
  const [user, setUser] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentHealth, setAgentHealth] = useState<any>(null);
  const [queueCount, setQueueCount] = useState(0);
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
  }, [router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      setToast({ message: "Deal status updated successfully.", type: "success" });
      router.refresh();
      fetchData(); // Reload data
    } else {
      const err = await res.json();
      setToast({ message: `Error: ${err.error}`, type: "error" });
    }
  };

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading Operator Portal...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <header className="flex items-center justify-between shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-quantum-50">Operator Portal</h1>
           <div className="flex items-center gap-2 mt-1">
             <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-bold uppercase tracking-wider">
               System Administrator
             </span>
             {agentHealth && (
               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                 agentHealth.status === 'healthy' ? 'bg-accent-success/20 text-accent-success' : 'bg-accent-danger/20 text-accent-danger'
               }`}>
                 <Activity size={10} /> Agents: {agentHealth.status} ({agentHealth.success_rate}%)
               </span>
             )}
           </div>
        </div>
        
        <div className="flex gap-3">
           <Link 
             href="/operator/properties/review"
             className="px-4 py-2 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-lg text-sm font-medium flex items-center gap-2 transition border border-quantum-700"
           >
             <Database size={16} />
             Review Queue
             {queueCount > 0 && (
               <span className="bg-cyan-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                 {queueCount}
               </span>
             )}
           </Link>
        </div>
      </header>

      {queueCount > 80 && (
        <div className="bg-accent-danger/10 border border-accent-danger/20 rounded-lg p-3 flex items-center gap-3 text-accent-danger text-sm">
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
