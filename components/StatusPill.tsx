'use client';

import React from 'react';

export type DealStatus = 
  | 'NEW_SUBMISSION'
  | 'NEEDS_CLARIFICATION'
  | 'QUALIFIED'
  | 'MATCHING'
  | 'EXCLUSIVE_WINDOW_ACTIVE'
  | 'BUYER_COMMITTED'
  | 'WON_PENDING_CLOSE'
  | 'CLOSED_PAID'
  | 'LOST'
  | 'WITHDRAWN'
  | 'REJECTED';

export type PayoutStatus = 'pending' | 'paid';

interface StatusPillProps {
  status: DealStatus | PayoutStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  // Deal statuses
  NEW_SUBMISSION: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'New Submission' },
  NEEDS_CLARIFICATION: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Needs Clarification' },
  QUALIFIED: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Qualified' },
  MATCHING: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Matching' },
  EXCLUSIVE_WINDOW_ACTIVE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Exclusive Window' },
  BUYER_COMMITTED: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Buyer Committed' },
  WON_PENDING_CLOSE: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Pending Close' },
  CLOSED_PAID: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Closed & Paid' },
  LOST: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Lost' },
  WITHDRAWN: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Withdrawn' },
  REJECTED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
  // Payout statuses
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' },
  paid: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Paid' },
  // Referrer masked status
  'Active Deal': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Active Deal' },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md', className = '' }) => {
  const config = statusConfig[status] || { bg: 'bg-slate-500/20', text: 'text-slate-400', label: status };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span 
      className={`inline-flex items-center ${config.bg} ${config.text} ${sizeStyles[size]} rounded-full font-bold uppercase tracking-wider ${className}`}
    >
      {config.label}
    </span>
  );
};

// Helper function for referrer privacy - mask non-terminal statuses
export const maskStatusForReferrer = (status: string): string => {
  const terminalStatuses = ['CLOSED_PAID', 'LOST', 'WITHDRAWN'];
  return terminalStatuses.includes(status) ? status : 'Active Deal';
};

StatusPill.displayName = 'StatusPill';
