'use client';

import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { downloadCsvFile, formatCurrency } from '@/lib/export/exporter';
import { TransactionType } from '@/lib/types';

interface UnifiedTransactionRow {
  id: string;
  code: string;
  date: string;
  type: TransactionType;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
}

export default function FinancialTransactionsLedgerPage() {
  const { dataset, selectedPropertyId } = useEstaviaStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const rows = useMemo<UnifiedTransactionRow[]>(() => {
    const list: UnifiedTransactionRow[] = [];

    for (const p of dataset.rentPayments) {
      const prop = dataset.properties.find((item) => item.id === p.propertyId);
      const unit = dataset.units.find((item) => item.id === p.unitId);
      const ten = dataset.tenants.find((item) => item.id === p.tenantId);
      const txType: TransactionType =
        p.type === 'Payment'
          ? 'Rent Payment'
          : p.type === 'Credit'
          ? 'Rent Credit'
          : 'Payment Reversal';
      list.push({
        id: p.id,
        code: p.code,
        date: p.date,
        type: txType,
        propertyId: p.propertyId,
        propertyName: prop?.name || '—',
        unitNumber: unit?.unitNumber || '—',
        tenantName: ten?.fullName || '—',
        amount: p.type === 'Reversal' ? -p.amount : p.amount,
        method: p.method,
        reference: p.reference,
        notes: p.isReversed ? `${p.notes} [Reversed]` : p.notes,
      });
    }

    for (const d of dataset.depositTransactions) {
      const prop = dataset.properties.find((item) => item.id === d.propertyId);
      const unit = dataset.units.find((item) => item.id === d.unitId);
      const ten = dataset.tenants.find((item) => item.id === d.tenantId);
      const txType: TransactionType =
        d.type === 'Receipt'
          ? 'Security Deposit Receipt'
          : d.type === 'Deduction'
          ? 'Security Deposit Deduction'
          : 'Security Deposit Return';
      list.push({
        id: d.id,
        code: d.code,
        date: d.date,
        type: txType,
        propertyId: d.propertyId,
        propertyName: prop?.name || '—',
        unitNumber: unit?.unitNumber || '—',
        tenantName: ten?.fullName || '—',
        amount: d.type === 'Return' ? -d.amount : d.amount,
        method: 'Escrow Demo Ledger',
        reference: d.reference,
        notes: d.notes,
      });
    }

    for (const e of dataset.expenses) {
      if (e.archived || e.status !== 'Paid') continue;
      const prop = dataset.properties.find((item) => item.id === e.propertyId);
      const unit = e.unitId
        ? dataset.units.find((item) => item.id === e.unitId)
        : undefined;
      list.push({
        id: e.id,
        code: e.code,
        date: e.date,
        type: 'Expense Payment',
        propertyId: e.propertyId,
        propertyName: prop?.name || '—',
        unitNumber: unit?.unitNumber || 'Building-Wide',
        tenantName: e.category,
        amount: -e.amount,
        method: 'Vendor Disbursement Demo',
        reference: e.reference,
        notes: e.description,
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [dataset]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedPropertyId !== 'all' && r.propertyId !== selectedPropertyId)
        return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (
        q &&
        !r.code.toLowerCase().includes(q) &&
        !r.propertyName.toLowerCase().includes(q) &&
        !r.tenantName.toLowerCase().includes(q) &&
        !r.reference.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, selectedPropertyId, typeFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Code',
      'Date',
      'Transaction Type',
      'Property',
      'Unit',
      'Counterparty / Category',
      'Method',
      'Reference',
      'Amount',
      'Notes',
    ];
    const csvRows = filtered.map((r) => [
      r.code,
      r.date,
      r.type,
      r.propertyName,
      r.unitNumber,
      r.tenantName,
      r.method,
      r.reference,
      r.amount,
      r.notes,
    ]);
    downloadCsvFile('estavia-transactions-ledger.csv', headers, csvRows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Financial Transaction Ledger
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Unified demonstration ledger of rent receipts, credits, reversals, security deposit escrow entries, and operating disbursements. No real money transfers occur.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transaction code, reference, tenant..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Transaction Types</option>
          <option value="Rent Payment">Rent Payment</option>
          <option value="Rent Credit">Rent Credit</option>
          <option value="Payment Reversal">Payment Reversal</option>
          <option value="Security Deposit Receipt">Security Deposit Receipt</option>
          <option value="Security Deposit Return">Security Deposit Return</option>
          <option value="Expense Payment">Expense Payment</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Property & Unit</th>
              <th className="py-3 px-4">Tenant / Category</th>
              <th className="py-3 px-4">Method & Reference</th>
              <th className="py-3 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.slice(0, 90).map((r) => (
              <tr key={r.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                <td className="py-3 px-4 font-mono font-semibold">{r.code}</td>
                <td className="py-3 px-4 font-mono">{r.date}</td>
                <td className="py-3 px-4 font-medium">{r.type}</td>
                <td className="py-3 px-4">
                  {r.propertyName} · <span className="font-mono">{r.unitNumber}</span>
                </td>
                <td className="py-3 px-4">{r.tenantName}</td>
                <td className="py-3 px-4 text-[#71807B]">
                  {r.method} (<span className="font-mono">{r.reference}</span>)
                </td>
                <td
                  className={`py-3 px-4 text-right font-mono font-semibold tabular-nums ${
                    r.amount < 0 ? 'text-[#DC2626]' : 'text-[#059669]'
                  }`}
                >
                  {formatCurrency(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
