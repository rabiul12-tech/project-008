'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Download,
  FileSignature,
  Wrench,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  formatCurrency,
  generateRentReceiptPdf,
  generateSampleLeasePdf,
} from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';

const TENANT_TABS = [
  'Overview',
  'Leases',
  'Rent Ledger',
  'Payments',
  'Maintenance Requests',
  'Documents & Links',
  'Activity',
] as const;

type TenantTab = (typeof TENANT_TABS)[number];

export default function Tenant360ProfilePage() {
  const params = useParams<{ id: string }>();
  const tenantId = params?.id || 'ten-1';

  const { dataset, settings, setQuickModal } = useEstaviaStore();
  const [activeTab, setActiveTab] = useState<TenantTab>('Overview');

  const tenant = useMemo(
    () => dataset.tenants.find((t) => t.id === tenantId) || dataset.tenants[0],
    [dataset.tenants, tenantId]
  );

  const leases = useMemo(
    () => dataset.leases.filter((l) => l.tenantId === tenant.id),
    [dataset.leases, tenant.id]
  );

  const activeLease = useMemo(
    () => leases.find((l) => l.status === 'Active') || leases[0],
    [leases]
  );

  const currentProperty = useMemo(
    () =>
      activeLease
        ? dataset.properties.find((p) => p.id === activeLease.propertyId)
        : undefined,
    [dataset.properties, activeLease]
  );

  const currentUnit = useMemo(
    () =>
      activeLease
        ? dataset.units.find((u) => u.id === activeLease.unitId)
        : undefined,
    [dataset.units, activeLease]
  );

  const rentCharges = useMemo(
    () => dataset.rentCharges.filter((c) => c.tenantId === tenant.id),
    [dataset.rentCharges, tenant.id]
  );

  const payments = useMemo(
    () => dataset.rentPayments.filter((p) => p.tenantId === tenant.id),
    [dataset.rentPayments, tenant.id]
  );

  const depositBalance = useMemo(() => {
    const txs = dataset.depositTransactions.filter((d) => d.tenantId === tenant.id);
    const rec = txs
      .filter((t) => t.type === 'Receipt')
      .reduce((s, t) => s + t.amount, 0);
    const ded = txs
      .filter((t) => t.type === 'Deduction' || t.type === 'Return')
      .reduce((s, t) => s + t.amount, 0);
    return Math.max(0, rec - ded);
  }, [dataset.depositTransactions, tenant.id]);

  const outstandingRent = useMemo(
    () =>
      rentCharges
        .filter((c) => c.status !== 'Voided')
        .reduce((sum, c) => sum + c.balance, 0),
    [rentCharges]
  );

  const maintenance = useMemo(
    () =>
      dataset.maintenanceRequests.filter(
        (m) => m.tenantId === tenant.id || (currentUnit && m.unitId === currentUnit.id)
      ),
    [dataset.maintenanceRequests, tenant.id, currentUnit]
  );

  const activities = useMemo(
    () => dataset.activities.filter((a) => a.tenantId === tenant.id),
    [dataset.activities, tenant.id]
  );

  const initials = `${tenant.firstName[0] || 'T'}${tenant.lastName[0] || 'R'}`;

  return (
    <div className="space-y-6">
      {/* Tenant 360 Header */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden">
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#146C63] text-white flex items-center justify-center text-lg font-bold font-mono shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight">{tenant.fullName}</h1>
                <StatusText status={activeLease?.status || 'Active'} />
              </div>
              <p className="text-xs font-mono text-[#71807B] dark:text-[#9CB0AA] mt-0.5">
                {tenant.code} · {tenant.email} · {tenant.phone}
              </p>
              <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
                {tenant.occupation} at {tenant.employer} · Move-In: {tenant.moveInDate || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickModal('record-payment')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#146C63] text-white text-xs font-medium"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickModal('create-maintenance')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Log Work Order</span>
            </button>
            {activeLease && currentProperty && currentUnit && (
              <button
                type="button"
                onClick={() =>
                  generateSampleLeasePdf({
                    lease: activeLease,
                    property: currentProperty,
                    unit: currentUnit,
                    tenant,
                    companyName: settings.companyName,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample Lease PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Bar */}
        <div className="px-6 py-4 border-t border-[#E1E9E5] dark:border-[#304540] grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <p className="text-[#71807B]">Current Residence</p>
            <p className="font-semibold mt-0.5">
              {currentProperty ? `${currentProperty.name} · Unit ${currentUnit?.unitNumber}` : 'Unassigned'}
            </p>
          </div>
          <div>
            <p className="text-[#71807B]">Active Lease</p>
            <p className="font-mono font-semibold mt-0.5">
              {activeLease ? `${activeLease.code} ([${activeLease.startDate}, ${activeLease.endDate}))` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[#71807B]">Monthly Scheduled Rent</p>
            <p className="font-mono font-bold text-sm tabular-nums mt-0.5">
              {formatCurrency(activeLease?.monthlyRent || 0)}
            </p>
          </div>
          <div>
            <p className="text-[#71807B]">Security Deposit Held</p>
            <p className="font-mono font-bold text-sm tabular-nums text-[#146C63] dark:text-[#5BC4B4] mt-0.5">
              {formatCurrency(depositBalance)}
            </p>
          </div>
          <div>
            <p className="text-[#71807B]">Outstanding Balance</p>
            <p
              className={`font-mono font-bold text-sm tabular-nums mt-0.5 ${
                outstandingRent > 0 ? 'text-[#DC2626]' : 'text-[#059669]'
              }`}
            >
              {formatCurrency(outstandingRent)}
            </p>
          </div>
        </div>

        {/* 7 Tabs */}
        <div className="px-6 border-t border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] flex items-center gap-1 overflow-x-auto">
          {TENANT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab
                  ? 'border-[#146C63] text-[#146C63] dark:border-[#5BC4B4] dark:text-[#5BC4B4]'
                  : 'border-transparent text-[#71807B] hover:text-[#1C2927] dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3 text-xs">
            <h2 className="text-sm font-semibold">Tenant Dossier & Emergency Contact</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#71807B]">Full Name (Fictional):</span>
                <span className="font-medium">{tenant.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Emergency Contact:</span>
                <span>{tenant.emergencyContactName} ({tenant.emergencyContactPhone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Next Rent Due Date:</span>
                <span className="font-mono">2026-12-01</span>
              </div>
              <div className="pt-2 border-t border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                {tenant.notes}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3 text-xs">
            <h2 className="text-sm font-semibold">Recent Rent Ledger Summary</h2>
            <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {rentCharges.slice(0, 4).map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold">{c.code}</span> ·{' '}
                    <span className="font-mono">{c.billingPeriod}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums">{formatCurrency(c.amount)}</span>
                    <StatusText status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Leases' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Lease Code</th>
                <th className="py-3 px-4">Property & Unit</th>
                <th className="py-3 px-4">Interval [Start, End)</th>
                <th className="py-3 px-4 text-right">Monthly Rent</th>
                <th className="py-3 px-4 text-right">Security Deposit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {leases.map((l) => {
                const p = dataset.properties.find((item) => item.id === l.propertyId);
                const u = dataset.units.find((item) => item.id === l.unitId);
                return (
                  <tr key={l.id}>
                    <td className="py-3 px-4 font-mono font-semibold">{l.code}</td>
                    <td className="py-3 px-4">
                      {p?.name} · Unit {u?.unitNumber}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      [{l.startDate}, {l.endDate})
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(l.monthlyRent)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(l.securityDeposit)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={l.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/leases/${l.id}`}
                        className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                      >
                        Lease Workspace →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Rent Ledger' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Charge Amount</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Credits</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {rentCharges.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-mono font-semibold">{c.code}</td>
                  <td className="py-3 px-4 font-mono">{c.billingPeriod}</td>
                  <td className="py-3 px-4 font-mono">{c.dueDate}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(c.amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669]">
                    {formatCurrency(c.amountPaid)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(c.creditsApplied)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {formatCurrency(c.balance)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={c.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {currentProperty && currentUnit && (
                      <button
                        type="button"
                        onClick={() =>
                          generateRentReceiptPdf({
                            charge: c,
                            property: currentProperty,
                            unit: currentUnit,
                            tenant,
                            payments: payments.filter((p) => p.rentChargeId === c.id),
                            companyName: settings.companyName,
                          })
                        }
                        className="text-[#146C63] dark:text-[#5BC4B4] hover:underline font-medium"
                      >
                        PDF Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Payments' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Payment Code</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-4 font-mono font-semibold">{p.code}</td>
                  <td className="py-3 px-4 font-mono">{p.date}</td>
                  <td className="py-3 px-4">
                    {p.type} {p.isReversed ? '(Reversed)' : ''}
                  </td>
                  <td className="py-3 px-4">{p.method}</td>
                  <td className="py-3 px-4 font-mono">{p.reference}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Maintenance Requests' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Work Order</th>
                <th className="py-3 px-4">Reported Date</th>
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {maintenance.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 px-4 font-mono font-semibold">{m.code}</td>
                  <td className="py-3 px-4 font-mono">{m.reportedDate}</td>
                  <td className="py-3 px-4 font-medium">{m.title}</td>
                  <td className="py-3 px-4">{m.category}</td>
                  <td className="py-3 px-4">
                    <StatusText status={m.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={m.stage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Documents & Links' && (
        <div className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3 text-xs">
          <h2 className="text-sm font-semibold">Sample Lease Agreements</h2>
          <p className="text-[#71807B]">
            Generated client-side with watermark &ldquo;SAMPLE LEASE — NOT A LEGAL AGREEMENT&rdquo;.
          </p>
          {activeLease && currentProperty && currentUnit && (
            <button
              type="button"
              onClick={() =>
                generateSampleLeasePdf({
                  lease: activeLease,
                  property: currentProperty,
                  unit: currentUnit,
                  tenant,
                  companyName: settings.companyName,
                })
              }
              className="px-4 py-2 rounded-lg bg-[#146C63] text-white font-medium"
            >
              Download {activeLease.code} Sample PDF
            </button>
          )}
        </div>
      )}

      {activeTab === 'Activity' && (
        <div className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3 text-xs">
          <h2 className="text-sm font-semibold">Tenant Activity Log</h2>
          {activities.length === 0 ? (
            <p className="text-[#71807B]">No recent activity logged for this tenant.</p>
          ) : (
            activities.map((a) => (
              <div key={a.id} className="py-2 border-b border-[#E1E9E5] dark:border-[#304540]">
                <p className="font-semibold">{a.title}</p>
                <p className="text-[#71807B]">{a.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
