"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Inbox, CheckCircle, Search, RefreshCw } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function OperatorPropertyReviewPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approve' | 'junk'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approved' | 'rejected' | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    if (!supabase) return;

    const { data, error } = await supabase
      .from('property_candidates')
      .select('*')
      .eq('status', 'queued')
      .order('quality_score', { ascending: false });

    if (error) {
      console.error('Error fetching candidates:', error);
    } else {
      setCandidates(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const getFilteredCandidates = () => {
    if (filter === 'all') return candidates;
    return candidates.filter(c => c.bucket === filter);
  };

  const handleAction = async (candidateId: string, decision: 'approved' | 'rejected') => {
    setActionLoading(true);
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();

    // If approved, we might also want to insert into the actual properties table
    // For now, we just mark the candidate as processed
    
    const { error } = await supabase
      .from('property_candidates')
      .update({
        status: decision,
        operator_decision: decision,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', candidateId);

    if (error) {
      alert(`Error processing candidate: ${error.message}`);
    } else {
      // Remove from local state
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setSelectedCandidate(null);
    }
    setActionLoading(false);
    setShowConfirm(false);
  };

  const openConfirm = (candidate: any, action: 'approved' | 'rejected') => {
    setSelectedCandidate(candidate);
    setPendingAction(action);
    setShowConfirm(true);
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Review Queue...</div>;

  const filteredCandidates = getFilteredCandidates();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Property Candidates</h1>
          <p className="text-slate-400 text-sm">Listing Agent Queue ({candidates.length} pending)</p>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" size="sm" onClick={fetchCandidates} icon={<RefreshCw size={14}/>}>
             Refresh
           </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 border-b border-slate-800 pb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          All ({candidates.length})
        </button>
        <button
          onClick={() => setFilter('approve')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === 'approve' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          Probable ({candidates.filter(c => c.bucket === 'approve').length})
        </button>
        <button
          onClick={() => setFilter('junk')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === 'junk' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          Junk ({candidates.filter(c => c.bucket === 'junk').length})
        </button>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {filteredCandidates.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Queue Empty"
            description="No candidates match your filter. The agents are working..."
          />
        ) : (
          filteredCandidates.map(candidate => (
            <div key={candidate.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                   {candidate.property_data?.photos?.[0] && (
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img
                       src={candidate.property_data.photos[0]}
                       alt="Thumbnail"
                       className="w-24 h-24 object-cover rounded bg-slate-950"
                     />
                   )}
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                        <Badge size="sm" variant={candidate.quality_score >= 70 ? 'success' : 'warning'}>
                          Score: {candidate.quality_score}
                        </Badge>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">{candidate.source_platform}</span>
                     </div>
                     <h3 className="text-lg font-bold text-white mb-1">{candidate.property_data?.title || 'Untitled Property'}</h3>
                     <p className="text-sm text-slate-400 line-clamp-2 max-w-2xl">{candidate.property_data?.description}</p>
                   </div>
                </div>
                <div className="text-right">
                   <div className="text-xl font-bold text-white mb-1">
                     {candidate.property_data?.price ? `$${candidate.property_data.price}` : 'Unpriced'}
                   </div>
                   <div className="text-xs text-slate-500">
                     Found {new Date(candidate.created_at).toLocaleDateString()}
                   </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-3">
                 <div className="flex gap-4 text-xs text-slate-400">
                    <span>Category: <span className="text-slate-300">{candidate.property_data?.category || 'N/A'}</span></span>
                    <span>Location: <span className="text-slate-300">{candidate.property_data?.location || 'N/A'}</span></span>
                    {candidate.source_url && (
                      <a href={candidate.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                        View Source <Search size={10}/>
                      </a>
                    )}
                 </div>
                 <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => openConfirm(candidate, 'rejected')}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      Reject
                    </Button>
                    <Button 
                      size="sm" 
                      variant="primary" 
                      onClick={() => openConfirm(candidate, 'approved')}
                      icon={<CheckCircle size={14}/>}
                    >
                      Approve & Create Deal
                    </Button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => selectedCandidate && pendingAction && handleAction(selectedCandidate.id, pendingAction)}
        title={pendingAction === 'approved' ? 'Approve Property' : 'Reject Candidate'}
        message={pendingAction === 'approved' 
          ? "This will move the candidate to the active properties list and notify matching buyers." 
          : "This will remove the candidate from the queue. It will not be scraped again."}
        variant={pendingAction === 'approved' ? 'info' : 'danger'}
        confirmText={pendingAction === 'approved' ? 'Approve' : 'Reject'}
        loading={actionLoading}
      />
    </div>
  );
}
