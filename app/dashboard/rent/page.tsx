'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Download,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { calculateFinancialSummary } from '@/lib/engines/financial-engine';
import {
  downloadCsvFile,
  formatCurrency,
  generateRentReceiptPdf,
} from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import { RentCharge } from '@/lib/types';

export default function RentCollectionWorkspacePage() {
  const {
    dataset,
    settings,
    selectedPropertyId,
    selectedPeriod,
    generateMonthlyRent,
    recordRentPayment,
    reversePayment,
  } = useEstaviaStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [genPeriod, setGenPeriod] = useState<string>(
    selectedPeriod === 'all' ? '2026-11' : selectedPeriod
  );
  const [activeCharge, setActiveCharge] = useState<RentCharge | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payType, setPayType] = useState<'Payment' | 'Credit'>('Payment');
  const [payMethod, setPayMethod] = useState<
    'ACH Demo Transfer' | 'Wire Demo' | 'Check Record' | 'Card Demo'
  >('ACH Demo Transfer');
  const [payError, setPayError] = useState<string | null>(null);

  const fin = useMemo(
    () =>
      calculateFinancialSummary({
        rentCharges: dataset.rentCharges,
        expenses: dataset.expenses,
        depositTransactions: dataset.depositTransactions,
        propertyId: selectedPropertyId,
        billingPeriod: selectedPeriod,
      }),
    [dataset, selectedPropertyId, selectedPeriod]
  );

  const enrichedCharges = useMemo(() => {
    return dataset.rentCharges.map((charge) => {
      const property = dataset.properties.find((p) => p.id === charge.propertyId);
      const unit = dataset.units.find((u) => u.id === charge.unitId);
      const tenant = dataset.tenants.find((t) => t.id === charge.tenantId);
      const payments = dataset.rentPayments.filter(
        (p) => p.rentChargeId === charge.id
      );
      return { charge, property, unit, tenant, payments };
    });
  }, [dataset]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedCharges.filter(({ charge, property, unit, tenant }) => {
      if (selectedPropertyId !== 'all' && charge.propertyId !== selectedPropertyId)
        return false;
      if (selectedPeriod !== 'all' && charge.billingPeriod !== selectedPeriod)
        return false;
      if (statusFilter !== 'all' && charge.status !== statusFilter) return false;
      if (
        q &&
        !charge.code.toLowerCase().includes(q) &&
        !tenant?.fullName.toLowerCase().includes(q) &&
        !unit?.unitNumber.toLowerCase().includes(q) &&
        !property?.name.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [enrichedCharges, selectedPropertyId, selectedPeriod, statusFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Invoice Code',
      'Billing Period',
      'Due Date',
      'Property',
      'Unit',
      'Tenant',
      'Scheduled Amount',
      'Paid Amount',
      'Credits Applied',
      'Outstanding Balance',
      'Status',
    ];
    const rows = filtered.map(({ charge, property, unit, tenant }) => [
      charge.code,
      charge.billingPeriod,
      charge.dueDate,
      property?.name,
      unit?.unitNumber,
      tenant?.fullName,
      charge.amount,
      charge.amountPaid,
      charge.creditsApplied,
      charge.balance,
      charge.status,
    ]);
    downloadCsvFile(`estavia-rent-roll-${selectedPeriod}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rent Collection & Monthly Rent Roll
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Idempotent charge generation (<span className="font-mono">leaseId:billingPeriod:chargeType</span>), partial/full payment allocation, credit adjustments, and reversal auditing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-1">
            <select
              aria-label="Target Billing Period for Rent Generation"
              value={genPeriod}
              onChange={(e) => setGenPeriod(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono bg-transparent"
            >
              <option value="2026-11">2026-11 (Nov)</option>
              <option value="2026-12">2026-12 (Dec)</option>
              <option value="2026-10">2026-10 (Oct)</option>
            </select>
            <button
              type="button"
              onClick={() => generateMonthlyRent(genPeriod)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate Monthly Charges</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium hover:bg-[#F8FAF9]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Rent Roll CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Scheduled Rent</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-1">
            {formatCurrency(fin.scheduledRent)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Collected Rent</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#059669] dark:text-[#10B981] mt-1">
            {formatCurrency(fin.collectedRent)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Credits Applied</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#C99B58] mt-1">
            {formatCurrency(fin.creditsApplied)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Outstanding Balance</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#DC2626] dark:text-[#EF4444] mt-1">
            {formatCurrency(fin.outstandingRent)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Collection Rate</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#146C63] dark:text-[#5BC4B4] mt-1">
            {fin.collectionRate}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, tenant, unit, property..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Invoice Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Overdue">Overdue</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Voided">Voided</option>
        </select>
      </div>

      {/* Rent Roll Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Invoice</th>
              <th className="py-3 px-4">Period / Due</th>
              <th className="py-3 px-4">Tenant & Unit</th>
              <th className="py-3 px-4 text-right">Scheduled</th>
              <th className="py-3 px-4 text-right">Paid</th>
              <th className="py-3 px-4 text-right">Credits</th>
              <th className="py-3 px-4 text-right">Balance</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.slice(0, 80).map(({ charge, property, unit, tenant, payments }) => {
              const latestReversiblePayment = payments.find(
                (p) => p.type !== 'Reversal' && !p.isReversed
              );
              return (
                <tr key={charge.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                  <td className="py-3 px-4 font-mono font-semibold">{charge.code}</td>
                  <td className="py-3 px-4 font-mono">
                    {charge.billingPeriod}
                    <span className="block text-[10px] text-[#71807B]">
                      Due {charge.dueDate}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/tenants/${charge.tenantId}`}
                      className="font-semibold hover:underline block"
                    >
                      {tenant?.fullName}
                    </Link>
                    <span className="text-[11px] text-[#71807B]">
                      {property?.name} · Unit {unit?.unitNumber}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(charge.amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669]">
                    {formatCurrency(charge.amountPaid)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#C99B58]">
                    {formatCurrency(charge.creditsApplied)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {formatCurrency(charge.balance)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={charge.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      {charge.balance > 0 && charge.status !== 'Voided' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayError(null);
                            setActiveCharge(charge);
                            setPayAmount(charge.balance);
                            setPayType('Payment');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#146C63] text-white font-medium"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Pay / Credit</span>
                        </button>
                      )}

                      {latestReversiblePayment && (
                        <button
                          type="button"
                          onClick={() =>
                            reversePayment(
                              latestReversiblePayment.id,
                              'Operator ledger reversal'
                            )
                          }
                          className="p-1 text-[#71807B] hover:text-[#DC2626]"
                          title={`Reverse ${latestReversiblePayment.code} (${formatCurrency(
                            latestReversiblePayment.amount
                          )})`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {property && unit && tenant && (
                        <button
                          type="button"
                          onClick={() =>
                            generateRentReceiptPdf({
                              charge,
                              property,
                              unit,
                              tenant,
                              payments,
                              companyName: settings.companyName,
                            })
                          }
                          className="p-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                          title="Download Invoice / Receipt PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Record Payment / Credit Modal */}
      {activeCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">
              Record Payment or Credit — {activeCharge.code}
            </h2>
            <p className="text-xs text-[#71807B]">
              Outstanding invoice balance:{' '}
              <strong className="font-mono">{formatCurrency(activeCharge.balance)}</strong>. Enter a partial amount (e.g., 50%) or full balance.
            </p>
            {payError && (
              <p className="text-xs text-[#DC2626] bg-[#DC2626]/10 p-2.5 rounded-lg">
                {payError}
              </p>
            )}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = recordRentPayment({
                  rentChargeId: activeCharge.id,
                  amount: Number(payAmount),
                  type: payType,
                  method: payType === 'Credit' ? 'Credit Adjustment' : payMethod,
                  date: dataset.referenceDate,
                  reference: `MAN-${Date.now().toString().slice(-5)}`,
                  notes: 'Recorded in Rent Collection Workspace.',
                });
                if (!res.ok) {
                  setPayError(res.error || 'Could not record payment.');
                } else {
                  setActiveCharge(null);
                }
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Type</label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as 'Payment' | 'Credit')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Payment">Rent Payment</option>
                    <option value="Credit">Rent Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    max={activeCharge.balance}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(Number((activeCharge.balance / 2).toFixed(2)))}
                  className="px-2.5 py-1 text-xs rounded border border-[#E1E9E5] dark:border-[#304540]"
                >
                  50% Partial ({formatCurrency(activeCharge.balance / 2)})
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount(activeCharge.balance)}
                  className="px-2.5 py-1 text-xs rounded border border-[#E1E9E5] dark:border-[#304540]"
                >
                  100% Full ({formatCurrency(activeCharge.balance)})
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCharge(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Post to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
