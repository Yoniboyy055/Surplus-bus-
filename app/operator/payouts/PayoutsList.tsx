'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Check, AlertCircle, Clock, XCircle, DollarSign } from 'lucide-react';

interface Payout {
  id: string;
  deal_id: string;
  amount: number | null;
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
  referrers: {
    profiles: {
      email: string;
    } | null;
  } | null;
}

export function PayoutsList({ initialPayouts }: { initialPayouts: any[] }) {
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMarkAsPaid = (payout: any) => {
    setSelectedPayout(payout);
    setInternalNote('');
    setIsModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!selectedPayout || !internalNote.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId: selectedPayout.id,
          status: 'paid',
          internal_note: internalNote,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process payout');
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" size="sm" icon={<Check size={14} />}>PAID</Badge>;
      case 'pending':
        return <Badge variant="warning" size="sm" icon={<Clock size={14} />}>PENDING</Badge>;
      case 'failed':
        return <Badge variant="error" size="sm" icon={<XCircle size={14} />}>FAILED</Badge>;
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-medium text-xs border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Deal ID</th>
              <th className="px-6 py-4">Referrer</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {initialPayouts.length === 0 ? (
               <tr>
                 <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                   No payouts found.
                 </td>
               </tr>
            ) : (
              initialPayouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-300">
                    {payout.deal_id ? `DEAL-${payout.deal_id.substring(0, 8).toUpperCase()}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {payout.referrers?.profiles?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {formatCurrency(payout.amount)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(payout.status)}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(payout.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {payout.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => handleMarkAsPaid(payout)}
                        icon={<DollarSign size={14} />}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Payout"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmPayment} loading={loading} disabled={!internalNote.trim()}>
              Confirm Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Amount:</span>
              <span className="text-white font-bold">{selectedPayout && formatCurrency(selectedPayout.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Referrer:</span>
              <span className="text-white">{selectedPayout?.referrers?.profiles?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Deal:</span>
              <span className="text-white font-mono">{selectedPayout?.deal_id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Internal Note <span className="text-red-400">*</span>
            </label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Enter transaction reference or note..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[100px]"
            />
            <p className="text-xs text-slate-500">
              A note is required to maintain the audit trail.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
             <AlertCircle className="text-blue-400 shrink-0" size={20} />
             <div className="text-xs text-blue-300">
               <p className="font-bold mb-1">Confirmation Required</p>
               <p>This action is irreversible. The payout status will be updated to PAID and logged in the audit trail.</p>
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
