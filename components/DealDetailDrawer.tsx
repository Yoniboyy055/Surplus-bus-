'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, AlertCircle, CheckCircle, Shield, FileText, User } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from './ConfirmModal';

interface DealDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  onStatusChange: (dealId: string, newStatus: string, message?: string, internalNote?: string) => Promise<void>;
}

export function DealDetailDrawer({ isOpen, onClose, deal, onStatusChange }: DealDetailDrawerProps) {
  const [internalNote, setInternalNote] = useState('');
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchAuditLogs = useCallback(async () => {
    if (!deal || !supabase) return;
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false });
    setAuditLogs(data || []);
  }, [deal, supabase]);

  useEffect(() => {
    if (isOpen && deal) {
      document.body.style.overflow = 'hidden';
      fetchAuditLogs();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, deal, fetchAuditLogs]);

  if (!isOpen || !deal) return null;

  const initiateAction = (status: string) => {
    if (status === 'NEEDS_CLARIFICATION' && !clarificationMessage.trim()) {
      alert('Clarification message is required.');
      return;
    }
    if (!internalNote.trim()) {
      alert('Internal note is required for audit log.');
      return;
    }
    
    setPendingAction(status);
    setShowConfirm(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    setLoading(true);
    try {
      await onStatusChange(deal.id, pendingAction, clarificationMessage, internalNote);
      setShowConfirm(false);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto animate-slide-left">
          <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-6 flex items-center justify-between">
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-white">Deal Details</h2>
                  <Badge variant="default" className="font-mono">{deal.id.substring(0, 8).toUpperCase()}</Badge>
               </div>
               <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock size={14} />
                  <span>Created {new Date(deal.created_at).toLocaleString()}</span>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Status Section */}
            <section className="bg-slate-950 rounded-lg p-5 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Current Status</h3>
              <div className="flex items-center justify-between mb-6">
                <Badge size="lg" variant={deal.status === 'WON_PENDING_CLOSE' ? 'success' : 'info'}>
                  {deal.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm text-slate-300">Internal Audit Note <span className="text-red-400">*</span></label>
                   <textarea 
                      className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:border-blue-500 outline-none"
                      placeholder="Reason for status change..."
                      value={internalNote}
                      onChange={e => setInternalNote(e.target.value)}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <Button size="sm" variant="secondary" onClick={() => initiateAction('QUALIFIED')} disabled={loading}>
                      Qualify Deal
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => initiateAction('NEEDS_CLARIFICATION')} disabled={loading}>
                      Request Info
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => initiateAction('REJECTED')} disabled={loading}>
                      Reject
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => initiateAction('MATCHING')} disabled={loading}>
                      Start Matching
                    </Button>
                 </div>
                 
                 {deal.status === 'NEEDS_CLARIFICATION' && (
                   <div className="pt-4 border-t border-slate-800 space-y-2">
                      <label className="text-sm text-yellow-400">Clarification Message to Buyer</label>
                      <textarea 
                          className="w-full bg-slate-900 border border-yellow-500/30 rounded p-3 text-sm text-white focus:border-yellow-500 outline-none"
                          placeholder="What info is missing?"
                          value={clarificationMessage}
                          onChange={e => setClarificationMessage(e.target.value)}
                      />
                   </div>
                 )}
              </div>
            </section>

            {/* Deal Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Property Criteria</h3>
              <div className="bg-slate-950 rounded-lg p-5 border border-slate-800 text-sm space-y-3">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-slate-500 text-xs">Type</span>
                      <span className="text-slate-200 font-medium capitalize">{deal.criteria?.property_type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-xs">Max Price</span>
                      <span className="text-slate-200 font-medium">{deal.criteria?.max_price ? `$${deal.criteria.max_price}` : 'N/A'}</span>
                    </div>
                 </div>
                 <div>
                    <span className="block text-slate-500 text-xs mb-1">Location</span>
                    <span className="text-slate-200">{deal.criteria?.location || 'N/A'}</span>
                 </div>
                 <div>
                    <span className="block text-slate-500 text-xs mb-1">Notes</span>
                    <p className="text-slate-300 bg-slate-900 p-3 rounded border border-slate-800">
                      {deal.criteria?.notes || 'No notes provided.'}
                    </p>
                 </div>
              </div>
            </section>

            {/* Audit Log */}
            <section className="space-y-4">
               <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Audit Timeline</h3>
               <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-800">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative pl-8">
                       <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600" />
                       <div className="text-sm">
                          <p className="text-slate-300 font-medium">{log.action}</p>
                          <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()} • {log.actor_role}</p>
                          {log.metadata?.internal_note && (
                            <p className="mt-1 text-xs text-slate-400 italic">&quot;{log.metadata.internal_note}&quot;</p>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </section>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmAction}
        title="Confirm Status Change"
        message={`Are you sure you want to change the status to ${pendingAction?.replace(/_/g, ' ')}? This action will be logged in the audit trail.`}
        loading={loading}
      />
    </>
  );
}
