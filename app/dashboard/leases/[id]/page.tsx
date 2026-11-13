'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  formatCurrency,
  generateSampleLeasePdf,
} from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';

export default function LeaseDetailWorkspacePage() {
  const params = useParams<{ id: string }>();
  const leaseId = params?.id || 'lease-101';

  const { dataset, settings } = useEstaviaStore();

  const lease = useMemo(
    () => dataset.leases.find((l) => l.id === leaseId) || dataset.leases[0],
    [dataset.leases, leaseId]
  );

  const property = useMemo(
    () => dataset.properties.find((p) => p.id === lease.propertyId) || dataset.properties[0],
    [dataset.properties, lease.propertyId]
  );

  const unit = useMemo(
    () => dataset.units.find((u) => u.id === lease.unitId) || dataset.units[0],
    [dataset.units, lease.unitId]
  );

  const tenant = useMemo(
    () => dataset.tenants.find((t) => t.id === lease.tenantId) || dataset.tenants[0],
    [dataset.tenants, lease.tenantId]
  );

  const charges = useMemo(
    () => dataset.rentCharges.filter((c) => c.leaseId === lease.id),
    [dataset.rentCharges, lease.id]
  );

  const payments = useMemo(
    () => dataset.rentPayments.filter((p) => p.leaseId === lease.id),
    [dataset.rentPayments, lease.id]
  );

  const renewals = useMemo(
    () =>
      dataset.leaseRenewals.filter(
        (r) => r.originalLeaseId === lease.id || r.newLeaseId === lease.id
      ),
    [dataset.leaseRenewals, lease.id]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-mono tracking-tight">{lease.code}</h1>
            <StatusText status={lease.status} />
          </div>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            {property.name} · Unit {unit.unitNumber} · Resident:{' '}
            <Link
              href={`/dashboard/tenants/${tenant.id}`}
              className="font-semibold text-[#146C63] dark:text-[#5BC4B4] hover:underline"
            >
              {tenant.fullName}
            </Link>
          </p>
        </div>

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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample Lease PDF</span>
        </button>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Half-Open Term [Start, End)</p>
          <p className="text-sm font-bold font-mono mt-1">
            [{lease.startDate}, {lease.endDate})
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Scheduled Monthly Rent</p>
          <p className="text-lg font-bold font-mono tabular-nums mt-1">
            {formatCurrency(lease.monthlyRent)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Security Deposit</p>
          <p className="text-lg font-bold font-mono tabular-nums mt-1">
            {formatCurrency(lease.securityDeposit)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Payment Schedule</p>
          <p className="text-sm font-semibold mt-1">
            {lease.billingFrequency} · Day {lease.paymentDueDay}
          </p>
        </div>
      </div>

      {/* Sample Document Preview + Rent Invoices Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sample Lease Document Preview */}
        <div className="lg:col-span-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E1E9E5] dark:border-[#304540] pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#146C63] dark:text-[#5BC4B4]" />
              <h2 className="text-sm font-semibold">Sample Lease Document Preview</h2>
            </div>
            <span className="text-[11px] font-mono text-[#D97706] font-semibold">
              NON-BINDING DEMO
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D] border border-[#E1E9E5] dark:border-[#304540] font-mono text-xs space-y-2.5 leading-relaxed">
            <p className="font-bold text-[#DC2626] dark:text-[#EF4444] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>SAMPLE LEASE — NOT A LEGAL AGREEMENT</span>
            </p>
            <p>LEASE REFERENCE: {lease.code}</p>
            <p>MANAGING ENTITY: {settings.companyName}</p>
            <p>
              PREMISES: {property.name}, Unit {unit.unitNumber} ({unit.sqFt} sq ft)
            </p>
            <p>RESIDENT: {tenant.fullName} ({tenant.code})</p>
            <p>
              TERM INTERVAL: [{lease.startDate}, {lease.endDate})
            </p>
            <p>MONTHLY BASE RENT: {formatCurrency(lease.monthlyRent)}</p>
            <p>SECURITY DEPOSIT: {formatCurrency(lease.securityDeposit)}</p>
            {lease.terminationDate && (
              <p className="text-[#DC2626]">
                EARLY TERMINATION: {lease.terminationDate} ({lease.terminationReason})
              </p>
            )}
            <p className="text-[11px] text-[#71807B] pt-2 border-t border-[#E1E9E5] dark:border-[#304540]">
              SAMPLE LEASE — NOT A LEGAL AGREEMENT. Generated locally in the browser for portfolio demonstration purposes only.
            </p>
          </div>

          {renewals.length > 0 && (
            <div className="pt-2 space-y-1.5 text-xs">
              <h3 className="font-semibold">Versioned Renewal Lineage</h3>
              {renewals.map((r) => (
                <p key={r.id} className="text-[#71807B] font-mono">
                  Renewed on {r.renewedAt}: {formatCurrency(r.previousRent)} →{' '}
                  {formatCurrency(r.newRent)}/mo
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Rent Invoices & Payment History */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540]">
              <h2 className="text-sm font-semibold">Lease Rent Invoices ({charges.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                    <th className="py-2.5 px-4">Invoice</th>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">Paid</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
                  {charges.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-4 font-mono font-semibold">{c.code}</td>
                      <td className="py-2.5 px-4 font-mono">{c.billingPeriod}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#059669]">
                        {formatCurrency(c.amountPaid)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(c.balance)}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusText status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540]">
              <h2 className="text-sm font-semibold">Payment Allocations ({payments.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                    <th className="py-2.5 px-4">Payment ID</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-4 font-mono font-semibold">{p.code}</td>
                      <td className="py-2.5 px-4 font-mono">{p.date}</td>
                      <td className="py-2.5 px-4">{p.type}</td>
                      <td className="py-2.5 px-4">{p.method}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
