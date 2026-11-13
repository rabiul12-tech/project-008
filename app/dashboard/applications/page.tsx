'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  FileSignature,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import { RentalApplication } from '@/lib/types';

export default function RentalApplicationsPage() {
  const {
    dataset,
    addApplication,
    updateApplicationStatus,
    convertApplicationToLease,
  } = useEstaviaStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [convertingApp, setConvertingApp] = useState<RentalApplication | null>(null);
  const [convStart, setConvStart] = useState('2026-12-01');
  const [convEnd, setConvEnd] = useState('2027-12-01');
  const [convDeposit, setConvDeposit] = useState(3500);
  const [convErrors, setConvErrors] = useState<string[]>([]);

  // New application form state
  const [appName, setAppName] = useState('');
  const [appEmail, setAppEmail] = useState('');
  const [appPhone, setAppPhone] = useState('+1 (212) 555-0182');
  const [appPropId, setAppPropId] = useState(dataset.properties[0]?.id || 'prop-1');
  const [appUnitId, setAppUnitId] = useState(dataset.units[0]?.id || 'unit-1');
  const [appMoveIn, setAppMoveIn] = useState('2026-12-01');
  const [appRent, setAppRent] = useState(3600);
  const [appIncome, setAppIncome] = useState(14500);
  const [appEmp, setAppEmp] = useState('Principal Architect at Meridian');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.applications.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (
        q &&
        !a.applicantName.toLowerCase().includes(q) &&
        !a.code.toLowerCase().includes(q) &&
        !a.applicantEmail.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [dataset.applications, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rental Application Management
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Review fictional applicant dossiers, approve eligible candidates, and convert approved applications directly into a Tenant & Lease with conflict validation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Application</span>
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
            placeholder="Search applicant name, code, email..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Application Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Converted">Converted</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Application</th>
              <th className="py-3 px-4">Applicant (Fictional)</th>
              <th className="py-3 px-4">Interested Property & Unit</th>
              <th className="py-3 px-4">Requested Move-In</th>
              <th className="py-3 px-4 text-right">Proposed Rent</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Workflow Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.map((app) => {
              const prop = dataset.properties.find((p) => p.id === app.propertyId);
              const unit = dataset.units.find((u) => u.id === app.unitId);
              return (
                <tr key={app.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                  <td className="py-3 px-4 font-mono font-semibold">
                    {app.code}
                    <span className="block text-[11px] text-[#71807B]">
                      {app.applicationDate}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold block">{app.applicantName}</span>
                    <span className="text-[11px] text-[#71807B]">{app.applicantEmail}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium block">{prop?.name}</span>
                    <span className="font-mono text-[11px] text-[#71807B]">
                      Unit {unit?.unitNumber} ({unit?.type})
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{app.requestedMoveInDate}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(app.proposedRent)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={app.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      {(app.status === 'Submitted' || app.status === 'Draft') && (
                        <button
                          type="button"
                          onClick={() => updateApplicationStatus(app.id, 'Under Review')}
                          className="px-2.5 py-1 rounded border border-[#E1E9E5] dark:border-[#304540] hover:bg-[#F8FAF9]"
                        >
                          Review
                        </button>
                      )}
                      {(app.status === 'Submitted' || app.status === 'Under Review') && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateApplicationStatus(app.id, 'Approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#059669]/15 text-[#059669] font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateApplicationStatus(app.id, 'Rejected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#DC2626]/10 text-[#DC2626] font-medium"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      {app.status === 'Approved' && (
                        <button
                          type="button"
                          onClick={() => {
                            setConvErrors([]);
                            setConvStart(app.requestedMoveInDate || '2026-12-01');
                            setConvEnd('2027-12-01');
                            setConvDeposit(app.proposedRent);
                            setConvertingApp(app);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#146C63] text-white font-medium"
                        >
                          <FileSignature className="w-3 h-3" />
                          <span>Convert to Lease</span>
                        </button>
                      )}
                      {app.status === 'Converted' && app.convertedLeaseId && (
                        <Link
                          href={`/dashboard/leases/${app.convertedLeaseId}`}
                          className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                        >
                          View Lease →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Convert Approved Application Modal */}
      {convertingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">
              Convert Application {convertingApp.code} to Tenant & Lease
            </h2>
            <p className="text-xs text-[#71807B]">
              Creates a new Tenant record for <strong>{convertingApp.applicantName}</strong> and validates that the target unit has no conflicting exclusive lease during <span className="font-mono">[{convStart}, {convEnd})</span>.
            </p>
            {convErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{convErrors.join(' ')}</span>
              </div>
            )}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = convertApplicationToLease(convertingApp.id, {
                  startDate: convStart,
                  endDate: convEnd,
                  securityDeposit: Number(convDeposit),
                });
                if (!res.ok) {
                  setConvErrors(res.errors);
                } else {
                  setConvertingApp(null);
                }
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">
                    Lease Start (Inclusive)
                  </label>
                  <input
                    type="date"
                    required
                    value={convStart}
                    onChange={(e) => setConvStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">
                    Lease End (Exclusive)
                  </label>
                  <input
                    type="date"
                    required
                    value={convEnd}
                    onChange={(e) => setConvEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">
                  Security Deposit ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={convDeposit}
                  onChange={(e) => setConvDeposit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConvertingApp(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Validate & Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">Create Fictional Rental Application</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                addApplication({
                  applicantName: appName,
                  applicantEmail: appEmail || 'applicant@example.demo',
                  applicantPhone: appPhone,
                  propertyId: appPropId,
                  unitId: appUnitId,
                  applicationDate: dataset.referenceDate,
                  requestedMoveInDate: appMoveIn,
                  proposedRent: Number(appRent),
                  monthlyIncome: Number(appIncome),
                  employmentSummary: appEmp,
                  status: 'Submitted',
                  notes: 'Submitted via Rental Application form.',
                });
                setShowAddModal(false);
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Applicant Name *</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Clara Sorensen"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Fictional Email *</label>
                  <input
                    type="email"
                    required
                    value={appEmail}
                    onChange={(e) => setAppEmail(e.target.value)}
                    placeholder="clara.sorensen@example.demo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Property</label>
                  <select
                    value={appPropId}
                    onChange={(e) => {
                      setAppPropId(e.target.value);
                      const firstUnit = dataset.units.find(
                        (u) => !u.archived && u.propertyId === e.target.value
                      );
                      if (firstUnit) {
                        setAppUnitId(firstUnit.id);
                        setAppRent(firstUnit.askingRent);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {dataset.properties
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Interested Unit</label>
                  <select
                    value={appUnitId}
                    onChange={(e) => setAppUnitId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {dataset.units
                      .filter((u) => !u.archived && u.propertyId === appPropId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unitNumber} ({u.type})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Requested Move-In</label>
                  <input
                    type="date"
                    value={appMoveIn}
                    onChange={(e) => setAppMoveIn(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Proposed Rent ($)</label>
                  <input
                    type="number"
                    value={appRent}
                    onChange={(e) => setAppRent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
