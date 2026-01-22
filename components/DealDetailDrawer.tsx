'use client';

import React, { useState } from 'react';
import { StatusPill } from './StatusPill';
import { ConfirmModal } from './ConfirmModal';

interface AuditLog {
  id: string;
  action: string;
  actor_role: string;
  metadata: any;
  created_at: string;
}

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
  audit_logs?: AuditLog[];
}

interface DealDetailDrawerProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (dealId: string, newStatus: string, message?: string, internalNote?: string) => Promise<void>;
}

const statusTransitions: Record<string, { label: string; value: string; variant: 'primary' | 'secondary' | 'danger' | 'warning' }[]> = {
  NEW_SUBMISSION: [
    { label: 'Qualify', value: 'QUALIFIED', variant: 'primary' },
    { label: 'Request Clarification', value: 'NEEDS_CLARIFICATION', variant: 'warning' },
    { label: 'Reject', value: 'REJECTED', variant: 'danger' },
  ],
  NEEDS_CLARIFICATION: [
    { label: 'Qualify', value: 'QUALIFIED', variant: 'primary' },
    { label: 'Reject', value: 'REJECTED', variant: 'danger' },
  ],
  QUALIFIED: [
    { label: 'Start Matching', value: 'MATCHING', variant: 'primary' },
  ],
  MATCHING: [
    { label: 'Open Exclusive Window', value: 'EXCLUSIVE_WINDOW_ACTIVE', variant: 'primary' },
  ],
  EXCLUSIVE_WINDOW_ACTIVE: [],
  BUYER_COMMITTED: [
    { label: 'Mark Won (Pending Close)', value: 'WON_PENDING_CLOSE', variant: 'primary' },
    { label: 'Mark Lost', value: 'LOST', variant: 'danger' },
  ],
  WON_PENDING_CLOSE: [
    { label: 'Mark as Closed & Paid', value: 'CLOSED_PAID', variant: 'primary' },
    { label: 'Mark Lost', value: 'LOST', variant: 'danger' },
  ],
};

export const DealDetailDrawer: React.FC<DealDetailDrawerProps> = ({
  deal,
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    newStatus: string;
    variant: 'danger' | 'warning' | 'info';
    requireNote: boolean;
    requireMessage: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    newStatus: '',
    variant: 'info',
    requireNote: true,
    requireMessage: false,
  });
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !deal) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysSinceCreation = () => {
    const created = new Date(deal.created_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleActionClick = (action: { label: string; value: string; variant: string }) => {
    const requiresMessage = action.value === 'NEEDS_CLARIFICATION';
    const isDestructive = action.value === 'REJECTED' || action.value === 'LOST';
    const isTerminal = action.value === 'CLOSED_PAID';

    let message = `You are about to change this deal's status to: ${action.label.toUpperCase()}`;
    if (isDestructive) {
      message += '\n\nThis action is PERMANENT and cannot be undone.';
    }
    if (isTerminal) {
      message += '\n\nThis will mark the deal as complete and trigger payout processing.';
    }

    setConfirmModal({
      isOpen: true,
      title: action.label,
      message,
      newStatus: action.value,
      variant: isDestructive ? 'danger' : action.value === 'NEEDS_CLARIFICATION' ? 'warning' : 'info',
      requireNote: true,
      requireMessage: requiresMessage,
    });
  };

  const handleConfirm = async (note?: string) => {
    if (!note) return;
    
    setIsProcessing(true);
    await onStatusChange(
      deal.id,
      confirmModal.newStatus,
      confirmModal.requireMessage ? clarificationMessage : undefined,
      note
    );
    setIsProcessing(false);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setClarificationMessage('');
  };

  const availableActions = statusTransitions[deal.status] || [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-quantum-900 border-l border-quantum-700 z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-quantum-700">
          <div>
            <p className="text-xs text-quantum-500 font-mono">DEAL-{deal.id.substring(0, 8).toUpperCase()}</p>
            <div className="mt-1">
              <StatusPill status={deal.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-quantum-400 hover:text-quantum-50 hover:bg-quantum-800 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning Banners */}
          {deal.status === 'BUYER_COMMITTED' && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-400 font-bold">Buyer Committed</p>
              <p className="text-xs text-orange-300 mt-1">
                Proof of Funds required. Failure to complete may downgrade buyer track.
              </p>
            </div>
          )}
          
          {deal.status === 'NEEDS_CLARIFICATION' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400 font-bold">Awaiting Clarification</p>
              <p className="text-xs text-amber-300 mt-1">
                Deal is paused until buyer provides requested information.
              </p>
            </div>
          )}

          {/* Deal Summary */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-quantum-300 uppercase tracking-wider">Deal Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-quantum-800 rounded-lg">
                <p className="text-xs text-quantum-500 uppercase tracking-wider">Property Type</p>
                <p className="text-lg font-semibold text-quantum-50 capitalize mt-1">{deal.property_type}</p>
              </div>
              <div className="p-4 bg-quantum-800 rounded-lg">
                <p className="text-xs text-quantum-500 uppercase tracking-wider">Max Budget</p>
                <p className="text-lg font-semibold text-cyan-400 mt-1">{formatCurrency(deal.max_price)}</p>
              </div>
              <div className="p-4 bg-quantum-800 rounded-lg">
                <p className="text-xs text-quantum-500 uppercase tracking-wider">Age</p>
                <p className="text-lg font-semibold text-quantum-50 mt-1">{getDaysSinceCreation()} days</p>
              </div>
              <div className="p-4 bg-quantum-800 rounded-lg">
                <p className="text-xs text-quantum-500 uppercase tracking-wider">Created</p>
                <p className="text-sm font-medium text-quantum-300 mt-1">{formatDate(deal.created_at)}</p>
              </div>
            </div>
          </section>

          {/* Criteria Details */}
          {deal.criteria && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-quantum-300 uppercase tracking-wider">Criteria Details</h3>
              <div className="p-4 bg-quantum-800 rounded-lg space-y-3">
                {deal.criteria.location && (
                  <div>
                    <p className="text-xs text-quantum-500 uppercase tracking-wider">Location</p>
                    <p className="text-sm text-quantum-50 mt-1">{deal.criteria.location}</p>
                  </div>
                )}
                {deal.criteria.notes && (
                  <div>
                    <p className="text-xs text-quantum-500 uppercase tracking-wider">Notes</p>
                    <p className="text-sm text-quantum-300 mt-1">{deal.criteria.notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Participants */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-quantum-300 uppercase tracking-wider">Participants</h3>
            <div className="space-y-3">
              <div className="p-4 bg-quantum-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-quantum-500 uppercase tracking-wider">Buyer</p>
                  <p className="text-sm font-mono text-quantum-300 mt-1">
                    {deal.buyer_profile_id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <span className="px-2 py-1 bg-role-buyer/20 text-role-buyer text-xs font-bold rounded uppercase">Buyer</span>
              </div>
              {deal.referrer_profile_id && (
                <div className="p-4 bg-quantum-800 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-quantum-500 uppercase tracking-wider">Referrer</p>
                    <p className="text-sm font-mono text-quantum-300 mt-1">
                      {deal.referrer_profile_id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-role-referrer/20 text-role-referrer text-xs font-bold rounded uppercase">Referrer</span>
                </div>
              )}
            </div>
          </section>

          {/* Audit Timeline (if available) */}
          {deal.audit_logs && deal.audit_logs.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-quantum-300 uppercase tracking-wider">Audit Timeline</h3>
              <div className="space-y-2">
                {deal.audit_logs.map((log, index) => (
                  <div key={log.id || index} className="p-3 bg-quantum-800 rounded-lg flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-quantum-50">{log.action.replace(/_/g, ' ')}</p>
                        <span className="text-xs text-quantum-500">{formatDate(log.created_at)}</span>
                      </div>
                      <p className="text-xs text-quantum-400 mt-1">By: {log.actor_role}</p>
                      {log.metadata?.internal_note && (
                        <p className="text-xs text-quantum-500 mt-1 italic">&quot;{log.metadata.internal_note}&quot;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Actions Footer */}
        {availableActions.length > 0 && (
          <div className="border-t border-quantum-700 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-quantum-300 uppercase tracking-wider">Actions</h3>
            <div className="flex flex-wrap gap-3">
              {availableActions.map((action) => {
                const buttonStyles = {
                  primary: 'bg-cyan-500 hover:bg-cyan-400 text-quantum-950',
                  secondary: 'bg-quantum-700 hover:bg-quantum-600 text-quantum-50',
                  danger: 'bg-red-600 hover:bg-red-500 text-white',
                  warning: 'bg-amber-600 hover:bg-amber-500 text-white',
                };
                return (
                  <button
                    key={action.value}
                    onClick={() => handleActionClick(action)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${buttonStyles[action.variant]}`}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setClarificationMessage('');
        }}
        onConfirm={handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        cancelText="Cancel"
        variant={confirmModal.variant}
        requireNote={confirmModal.requireNote}
        noteLabel="Internal Note (Required for Audit)"
        notePlaceholder="Enter reason or details for this action..."
        loading={isProcessing}
      />

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

DealDetailDrawer.displayName = 'DealDetailDrawer';
