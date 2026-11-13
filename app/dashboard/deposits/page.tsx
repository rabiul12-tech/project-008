'use client';

import React, { useMemo, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { formatCurrency } from '@/lib/export/exporter';

export default function SecurityDepositsPage() {
  const { dataset, selectedPropertyId, recordDepositTransaction } =
    useEstaviaStore();

  const [showModal, setShowModal] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState(
    dataset.leases[0]?.id || ''
  );
  const [txType, setTxType] = useState<'Receipt' | 'Deduction' | 'Return'>('Receipt');
  const [txAmount, setTxAmount] = useState(1000);
  const [txNotes, setTxNotes] = useState('');

  const leaseDepositLedgers = useMemo(() => {
    return dataset.leases
      .filter(
        (l) =>
          (l.status === 'Active' || l.status === 'Terminated' || l.status === 'Expired') &&
          (selectedPropertyId === 'all' || l.propertyId === selectedPropertyId)
      )
      .map((lease) => {
        const prop = dataset.properties.find((p) => p.id === lease.propertyId);
        const unit = dataset.units.find((u) => u.id === lease.unitId);
        const tenant = dataset.tenants.find((t) => t.id === lease.tenantId);
        const txs = dataset.depositTransactions.filter(
          (d) => d.leaseId === lease.id
        );
        const received = txs
          .filter((t) => t.type === 'Receipt')
          .reduce((s, t) => s + t.amount, 0);
        const deductions = txs
          .filter((t) => t.type === 'Deduction')
          .reduce((s, t) => s + t.amount, 0);
        const returned = txs
          .filter((t) => t.type === 'Return')
          .reduce((s, t) => s + t.amount, 0);
        const held = Math.max(0, received - deductions - returned);
        const outstandingRequired = Math.max(0, lease.securityDeposit - received);

        return {
          lease,
          prop,
          unit,
          tenant,
          received,
          deductions,
          returned,
          held,
          outstandingRequired,
        };
      });
  }, [dataset, selectedPropertyId]);

  const totalHeld = useMemo(
    () => leaseDepositLedgers.reduce((s, item) => s + item.held, 0),
    [leaseDepositLedgers]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Security Deposit Ledger
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Security deposits are tracked separately from rental revenue and operating cash flow. Simplified portfolio demonstration (not a jurisdiction-compliant trust account).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Deposit Entry</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E9F5F1] dark:bg-[#203530] text-[#146C63] dark:text-[#5BC4B4] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#71807B]">Total Security Deposits Currently Held</p>
            <p className="text-2xl font-bold font-mono tabular-nums">
              {formatCurrency(totalHeld)}
            </p>
          </div>
        </div>
        <p className="text-xs text-[#71807B] max-w-md">
          Held deposits are excluded from Scheduled Rent, Collected Rent, and Operating Cash Flow across all ESTAVIA financial reports.
        </p>
      </div>

      {/* Deposit Ledger Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Lease</th>
              <th className="py-3 px-4">Tenant</th>
              <th className="py-3 px-4">Property & Unit</th>
              <th className="py-3 px-4 text-right">Required Deposit</th>
              <th className="py-3 px-4 text-right">Received</th>
              <th className="py-3 px-4 text-right">Deductions</th>
              <th className="py-3 px-4 text-right">Returned</th>
              <th className="py-3 px-4 text-right">Amount Held</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {leaseDepositLedgers.slice(0, 75).map((item) => (
              <tr key={item.lease.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                <td className="py-3 px-4 font-mono font-semibold">{item.lease.code}</td>
                <td className="py-3 px-4 font-medium">{item.tenant?.fullName}</td>
                <td className="py-3 px-4">
                  {item.prop?.name} · Unit {item.unit?.unitNumber}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatCurrency(item.lease.securityDeposit)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669]">
                  {formatCurrency(item.received)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-[#D97706]">
                  {formatCurrency(item.deductions)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatCurrency(item.returned)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#146C63] dark:text-[#5BC4B4]">
                  {formatCurrency(item.held)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Deposit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">Record Security Deposit Entry</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const lease = dataset.leases.find((l) => l.id === selectedLeaseId);
                if (!lease) return;
                recordDepositTransaction({
                  leaseId: lease.id,
                  propertyId: lease.propertyId,
                  unitId: lease.unitId,
                  tenantId: lease.tenantId,
                  date: dataset.referenceDate,
                  type: txType,
                  amount: Number(txAmount),
                  reference: `DEP-${Date.now().toString().slice(-4)}`,
                  notes: txNotes || `Security deposit ${txType.toLowerCase()}`,
                });
                setShowModal(false);
              }}
            >
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Lease</label>
                <select
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                >
                  {dataset.leases.slice(0, 50).map((l) => {
                    const t = dataset.tenants.find((item) => item.id === l.tenantId);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.code} — {t?.fullName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Entry Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as typeof txType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Receipt">Deposit Receipt</option>
                    <option value="Deduction">Repair Deduction</option>
                    <option value="Return">Deposit Return</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Amount ($)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Notes</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Move-in receipt or move-out return note..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
