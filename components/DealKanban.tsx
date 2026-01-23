'use client';

import React, { useState } from 'react';
import { DealDetailDrawer } from './DealDetailDrawer';
import { Badge } from './Badge';
import { AlertTriangle } from 'lucide-react';

interface DealKanbanProps {
  deals: any[];
  onStatusChange: (dealId: string, newStatus: string, message?: string, internalNote?: string) => Promise<void>;
}

const COLUMNS = [
  { id: 'NEW_SUBMISSION', title: 'New', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
  { id: 'NEEDS_CLARIFICATION', title: 'Clarification', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
  { id: 'QUALIFIED', title: 'Qualified', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  { id: 'MATCHING', title: 'Matching', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { id: 'BUYER_COMMITTED', title: 'Committed', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
  { id: 'WON_PENDING_CLOSE', title: 'Closing', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
];

export function DealKanban({ deals, onStatusChange }: DealKanbanProps) {
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  const getDealsByStatus = (status: string) => {
    return deals.filter(deal => deal.status === status);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-200px)]">
        {COLUMNS.map(column => {
          const columnDeals = getDealsByStatus(column.id);
          return (
            <div key={column.id} className="min-w-[300px] max-w-[300px] flex flex-col">
              <div className={`p-3 rounded-t-lg border-x border-t ${column.color} flex justify-between items-center`}>
                <span className="font-bold text-sm uppercase tracking-wider">{column.title}</span>
                <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded">{columnDeals.length}</span>
              </div>
              <div className="bg-quantum-900/30 border-x border-b border-quantum-700 rounded-b-lg flex-1 p-2 space-y-3">
                {columnDeals.map(deal => (
                  <div 
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="bg-quantum-950 p-3 rounded border border-quantum-700 hover:border-quantum-600 hover:shadow-lg transition cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-mono text-[10px] text-quantum-500 group-hover:text-cyan-400 transition">#{deal.id.substring(0, 6)}</span>
                       <span className="text-[10px] text-quantum-500">{new Date(deal.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm text-quantum-200 font-medium mb-1">
                        {deal.criteria?.property_type || 'Unknown Type'}
                      </div>
                      <div className="text-xs text-quantum-400">
                        {deal.criteria?.max_price ? `$${deal.criteria.max_price}` : 'No Price'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge size="sm" variant={deal.buyer_track_snapshot === 'A' ? 'success' : 'default'} className="text-[10px] px-1.5 py-0">
                        Track {deal.buyer_track_snapshot || 'B'}
                      </Badge>
                      {deal.status === 'BUYER_COMMITTED' && (
                        <AlertTriangle size={12} className="text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
                {columnDeals.length === 0 && (
                   <div className="text-center py-8 text-quantum-500 text-xs italic">
                     No deals
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DealDetailDrawer 
        isOpen={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        deal={selectedDeal}
        onStatusChange={onStatusChange}
      />
    </>
  );
}
