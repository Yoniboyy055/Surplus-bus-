"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { DealDetailDrawer } from "@/components/DealDetailDrawer";

interface Deal {
  id: string;
  status: string;
  property_type: string;
  max_price: number;
  criteria: any;
  buyer_profile_id: string;
  referrer_profile_id: string | null;
  created_at: string;
  updated_at: string;
  exclusive_ends_at: string | null;
}

const KANBAN_COLUMNS = [
  { id: 'NEW_SUBMISSION', label: 'New Submissions', color: 'cyan' },
  { id: 'NEEDS_CLARIFICATION', label: 'Needs Clarification', color: 'amber' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'blue' },
  { id: 'MATCHING', label: 'Matching', color: 'purple' },
  { id: 'BUYER_COMMITTED', label: 'Buyer Committed', color: 'orange' },
  { id: 'WON_PENDING_CLOSE', label: 'Pending Close', color: 'emerald' },
];

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysSinceCreation = () => {
    const created = new Date(deal.created_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getBuyerTrack = () => {
    // In a real implementation, this would come from the deal data
    // For now, we'll show it as placeholder
    return deal.criteria?.buyer_track || 'B';
  };

  return (
    <div 
      onClick={onClick}
      className="p-4 bg-quantum-800 border border-quantum-700 rounded-lg hover:border-cyan-500/50 hover:shadow-card-hover cursor-pointer transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[10px] text-quantum-500 bg-quantum-900 px-2 py-1 rounded">
          {deal.id.substring(0, 8).toUpperCase()}
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          getBuyerTrack() === 'A' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-cyan-500/20 text-cyan-400'
        }`}>
          Track {getBuyerTrack()}
        </span>
      </div>

      {/* Property Info */}
      <div className="space-y-2 mb-3">
        <p className="text-sm font-semibold text-quantum-50 capitalize">{deal.property_type}</p>
        <p className="text-lg font-bold text-cyan-400">{formatCurrency(deal.max_price)}</p>
      </div>

      {/* Location if available */}
      {deal.criteria?.location && (
        <p className="text-xs text-quantum-400 mb-3 truncate">{deal.criteria.location}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-quantum-700/50">
        <span className="text-[10px] text-quantum-500">
          {getDaysSinceCreation()} days old
        </span>
        <span className="text-[10px] text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Click to view →
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({ column, deals, onDealClick }: { 
  column: { id: string; label: string; color: string }; 
  deals: Deal[]; 
  onDealClick: (deal: Deal) => void;
}) {
  const colorStyles: Record<string, string> = {
    cyan: 'border-cyan-500/30',
    amber: 'border-amber-500/30',
    blue: 'border-blue-500/30',
    purple: 'border-purple-500/30',
    orange: 'border-orange-500/30',
    emerald: 'border-emerald-500/30',
  };

  const headerColorStyles: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  return (
    <div className={`flex-shrink-0 w-80 bg-quantum-900/50 rounded-xl border ${colorStyles[column.color]} flex flex-col max-h-[calc(100vh-280px)]`}>
      {/* Column Header */}
      <div className={`px-4 py-3 rounded-t-xl ${headerColorStyles[column.color]}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider">{column.label}</h3>
          <span className="text-xs font-bold bg-quantum-950/50 px-2 py-1 rounded-full">
            {deals.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {deals.length === 0 ? (
          <div className="text-center py-8 text-quantum-600 text-xs">
            No deals
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard 
              key={deal.id} 
              deal={deal} 
              onClick={() => onDealClick(deal)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function OperatorPortal() {
  const [user, setUser] = useState<any>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const fetchDeals = async () => {
    if (!supabase) return;
    
    const { data: allDeals } = await supabase
      .from('deals')
      .select('*')
      .not('status', 'in', '("CLOSED_PAID","LOST","WITHDRAWN","REJECTED")')
      .order('created_at', { ascending: true });
    
    setDeals(allDeals || []);
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
      if (profile?.role !== "operator") {
        router.push("/dashboard");
        return;
      }

      // Fetch deals inline to avoid dependency issues
      const { data: allDeals } = await supabase
        .from('deals')
        .select('*')
        .not('status', 'in', '("CLOSED_PAID","LOST","WITHDRAWN","REJECTED")')
        .order('created_at', { ascending: true });
      
      setDeals(allDeals || []);
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const handleDealClick = async (deal: Deal) => {
    // Fetch audit logs for the deal
    if (supabase) {
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('deal_id', deal.id)
        .order('created_at', { ascending: false });
      
      setSelectedDeal({ ...deal, audit_logs: auditLogs || [] } as Deal & { audit_logs: any[] });
    } else {
      setSelectedDeal(deal);
    }
    setIsDrawerOpen(true);
  };

  const handleStatusChange = async (dealId: string, newStatus: string, message?: string, internalNote?: string) => {
    const res = await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        dealId, 
        status: newStatus, 
        message: message || '', 
        internal_note: internalNote 
      })
    });

    if (res.ok) {
      await fetchDeals();
      setIsDrawerOpen(false);
      setSelectedDeal(null);
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  // Group deals by status
  const dealsByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = deals.filter(deal => deal.status === column.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  // Count action required deals
  const actionRequiredCount = (dealsByStatus['NEW_SUBMISSION']?.length || 0) + 
                              (dealsByStatus['NEEDS_CLARIFICATION']?.length || 0) + 
                              (dealsByStatus['WON_PENDING_CLOSE']?.length || 0);

  if (loading) return (
    <div className="text-center py-20 text-quantum-500">
      Loading Operator Portal...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-quantum-50">Operator Portal</h1>
          <p className="text-quantum-400 mt-1">Manage deals and process payouts</p>
        </div>
        <div className="flex gap-3">
          {actionRequiredCount > 0 && (
            <div className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              {actionRequiredCount} Action Required
            </div>
          )}
          <a 
            href="/operator/payouts"
            className="px-4 py-2 bg-quantum-700 hover:bg-quantum-600 text-quantum-50 rounded-lg text-sm font-medium transition"
          >
            Manage Payouts
          </a>
        </div>
      </header>

      {/* Action Required Banner */}
      {actionRequiredCount > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-400">ACTION REQUIRED</p>
              <p className="text-xs text-red-300 mt-1">
                {dealsByStatus['NEW_SUBMISSION']?.length || 0} new submissions · {' '}
                {dealsByStatus['NEEDS_CLARIFICATION']?.length || 0} awaiting clarification · {' '}
                {dealsByStatus['WON_PENDING_CLOSE']?.length || 0} pending close
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              deals={dealsByStatus[column.id] || []}
              onDealClick={handleDealClick}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {deals.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto bg-quantum-800 rounded-xl flex items-center justify-center text-quantum-600 mb-4">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-quantum-400">No active deals in the pipeline.</p>
          <p className="text-quantum-500 text-sm mt-1">New submissions will appear here.</p>
        </div>
      )}

      {/* Deal Detail Drawer */}
      <DealDetailDrawer
        deal={selectedDeal}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDeal(null);
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
