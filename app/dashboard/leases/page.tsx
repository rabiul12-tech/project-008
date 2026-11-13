'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Download,
  FileSignature,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  formatCurrency,
  generateSampleLeasePdf,
} from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import { Lease } from '@/lib/types';

export default function LeasesManagementPage() {
  const {
    dataset,
    settings,
    selectedPropertyId,
    setQuickModal,
    changeLeaseStatus,
    renewLease,
  } = useEstaviaStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [renewingLease, setRenewingLease] = useState<Lease | null>(null);
  const [renStart, setRenStart] = useState('');
  const [renEnd, setRenEnd] = useState('');
  const [renRent, setRenRent] = useState(0);
  const [renErrors, setRenErrors] = useState<string[]>([]);

  const [terminatingLease, setTerminatingLease] = useState<Lease | null>(null);
  const [termDate, setTermDate] = useState('2026-11-30');
  const [termReason, setTermReason] = useState('Mutual early lease termination agreement');

  const enrichedLeases = useMemo(() => {
    return dataset.leases.map((lease) => {
      const property = dataset.properties.find((p) => p.id === lease.propertyId);
      const unit = dataset.units.find((u) => u.id === lease.unitId);
      const tenant = dataset.tenants.find((t) => t.id === lease.tenantId);
      return { lease, property, unit, tenant };
    });
  }, [dataset]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedLeases.filter(({ lease, property, unit, tenant }) => {
      if (selectedPropertyId !== 'all' && lease.propertyId !== selectedPropertyId)
        return false;
      if (statusFilter !== 'all' && lease.status !== statusFilter) return false;
      if (
        q &&
        !lease.code.toLowerCase().includes(q) &&
        !property?.name.toLowerCase().includes(q) &&
        !unit?.unitNumber.toLowerCase().includes(q) &&
        !tenant?.fullName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [enrichedLeases, selectedPropertyId, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Lease Lifecycle Management
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Centralized Lease Engine enforcing half-open date intervals <span className="font-mono">[startDate, endDate)</span>, zero-overlap exclusivity, and versioned renewals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setQuickModal('create-lease')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Lease Agreement</span>
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
            placeholder="Search lease ID, tenant, unit, property..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Lease Statuses</option>
          <option value="Active">Active</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Draft">Draft</option>
          <option value="Expired">Expired</option>
          <option value="Terminated">Terminated</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Leases Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Lease ID</th>
              <th className="py-3 px-4">Property & Unit</th>
              <th className="py-3 px-4">Tenant</th>
              <th className="py-3 px-4">Interval [Start, End)</th>
              <th className="py-3 px-4 text-right">Monthly Rent</th>
              <th className="py-3 px-4 text-right">Security Deposit</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.slice(0, 80).map(({ lease, property, unit, tenant }) => (
              <tr key={lease.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                <td className="py-3 px-4 font-mono font-semibold">
                  <Link
                    href={`/dashboard/leases/${lease.id}`}
                    className="hover:text-[#146C63] dark:hover:text-[#5BC4B4]"
                  >
                    {lease.code}
                  </Link>
                  {lease.renewedToLeaseId && (
                    <span className="block text-[10px] text-[#059669]">Renewed</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium block">{property?.name}</span>
                  <span className="font-mono text-[11px] text-[#71807B]">
                    Unit {unit?.unitNumber}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {tenant ? (
                    <Link
                      href={`/dashboard/tenants/${tenant.id}`}
                      className="font-medium hover:underline"
                    >
                      {tenant.fullName}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3 px-4 font-mono">
                  [{lease.startDate}, {lease.endDate})
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                  {formatCurrency(lease.monthlyRent)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatCurrency(lease.securityDeposit)}
                </td>
                <td className="py-3 px-4">
                  <StatusText status={lease.status} />
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/dashboard/leases/${lease.id}`}
                      className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                    >
                      Detail
                    </Link>

                    {(lease.status === 'Draft' || lease.status === 'Scheduled') && (
                      <button
                        type="button"
                        onClick={() => changeLeaseStatus(lease.id, 'Active')}
                        className="px-2 py-1 rounded bg-[#059669]/15 text-[#059669] font-medium"
                      >
                        Activate
                      </button>
                    )}

                    {lease.status === 'Active' && !lease.renewedToLeaseId && (
                      <button
                        type="button"
                        onClick={() => {
                          setRenErrors([]);
                          setRenStart(lease.endDate);
                          const nextYear = Number(lease.endDate.slice(0, 4)) + 1;
                          setRenEnd(`${nextYear}${lease.endDate.slice(4)}`);
                          setRenRent(Math.round((lease.monthlyRent * 1.04) / 25) * 25);
                          setRenewingLease(lease);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E9F5F1] dark:bg-[#203530] text-[#146C63] dark:text-[#5BC4B4] font-medium"
                        title="Renew Lease Term"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Renew</span>
                      </button>
                    )}

                    {lease.status === 'Active' && (
                      <button
                        type="button"
                        onClick={() => setTerminatingLease(lease)}
                        className="p-1 text-[#71807B] hover:text-[#DC2626]"
                        title="Terminate Lease"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {property && unit && tenant && (
                      <button
                        type="button"
                        onClick={() =>
                          generateSampleLeasePdf({
                            lease,
                            property,
                            unit,
                            tenant,
                            companyName: settings.companyName,
                          })
                        }
                        className="p-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                        title="Download Sample Lease PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Renew Lease Modal */}
      {renewingLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">
              Renew Lease Agreement — {renewingLease.code}
            </h2>
            <p className="text-xs text-[#71807B]">
              Creates a new versioned lease record starting on or after <span className="font-mono">{renewingLease.endDate}</span> while preserving the historical lease snapshot.
            </p>
            {renErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{renErrors.join(' ')}</span>
              </div>
            )}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = renewLease({
                  originalLeaseId: renewingLease.id,
                  newStartDate: renStart,
                  newEndDate: renEnd,
                  newMonthlyRent: Number(renRent),
                });
                if (!res.ok) {
                  setRenErrors(res.errors);
                } else {
                  setRenewingLease(null);
                }
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">
                    New Start Date (Inclusive)
                  </label>
                  <input
                    type="date"
                    required
                    value={renStart}
                    onChange={(e) => setRenStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">
                    New End Date (Exclusive)
                  </label>
                  <input
                    type="date"
                    required
                    value={renEnd}
                    onChange={(e) => setRenEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">
                  Renewal Monthly Rent ($) (Previous: {formatCurrency(renewingLease.monthlyRent)})
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={renRent}
                  onChange={(e) => setRenRent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenewingLease(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Execute Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminate Lease Modal */}
      {terminatingLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">
              Terminate Lease — {terminatingLease.code}
            </h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                changeLeaseStatus(terminatingLease.id, 'Terminated', {
                  terminationDate: termDate,
                  terminationReason: termReason,
                });
                setTerminatingLease(null);
              }}
            >
              <div>
                <label className="block text-xs text-[#71807B] mb-1">
                  Effective Termination Date
                </label>
                <input
                  type="date"
                  required
                  value={termDate}
                  onChange={(e) => setTermDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={termReason}
                  onChange={(e) => setTermReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTerminatingLease(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#DC2626] text-white"
                >
                  Confirm Termination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
