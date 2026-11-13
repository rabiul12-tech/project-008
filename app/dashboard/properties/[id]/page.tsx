'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building,
  CreditCard,
  FileSignature,
  Plus,
  Wrench,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  calculateOccupancySummary,
  deriveUnitOccupancyStatus,
} from '@/lib/engines/occupancy-engine';
import { calculateFinancialSummary } from '@/lib/engines/financial-engine';
import { formatCurrency, generateSampleLeasePdf } from '@/lib/export/exporter';
import { PropertyArtwork } from '@/components/ui/PropertyArtwork';
import { StatusText } from '@/components/ui/StatusText';

const TABS = [
  'Overview',
  'Units',
  'Tenants',
  'Leases',
  'Rent Collection',
  'Maintenance',
  'Expenses',
  'Inspections',
  'Documents & Links',
  'Activity',
] as const;

type PropertyTab = (typeof TABS)[number];

export default function Property360WorkspacePage() {
  const params = useParams<{ id: string }>();
  const propertyId = params?.id || 'prop-1';

  const { dataset, settings, selectedPeriod, setQuickModal } = useEstaviaStore();
  const [activeTab, setActiveTab] = useState<PropertyTab>('Overview');

  const property = useMemo(
    () => dataset.properties.find((p) => p.id === propertyId) || dataset.properties[0],
    [dataset.properties, propertyId]
  );

  const units = useMemo(
    () => dataset.units.filter((u) => !u.archived && u.propertyId === property.id),
    [dataset.units, property.id]
  );

  const leases = useMemo(
    () => dataset.leases.filter((l) => l.propertyId === property.id),
    [dataset.leases, property.id]
  );

  const activeLeases = useMemo(
    () => leases.filter((l) => l.status === 'Active'),
    [leases]
  );

  const tenants = useMemo(() => {
    const tenantIds = new Set(activeLeases.map((l) => l.tenantId));
    return dataset.tenants.filter((t) => tenantIds.has(t.id));
  }, [dataset.tenants, activeLeases]);

  const rentCharges = useMemo(
    () => dataset.rentCharges.filter((c) => c.propertyId === property.id),
    [dataset.rentCharges, property.id]
  );

  const maintenance = useMemo(
    () => dataset.maintenanceRequests.filter((m) => m.propertyId === property.id),
    [dataset.maintenanceRequests, property.id]
  );

  const expenses = useMemo(
    () => dataset.expenses.filter((e) => !e.archived && e.propertyId === property.id),
    [dataset.expenses, property.id]
  );

  const inspections = useMemo(
    () => dataset.inspections.filter((i) => i.propertyId === property.id),
    [dataset.inspections, property.id]
  );

  const activities = useMemo(
    () => dataset.activities.filter((a) => a.propertyId === property.id),
    [dataset.activities, property.id]
  );

  const occ = useMemo(
    () => calculateOccupancySummary(units, leases, dataset.referenceDate),
    [units, leases, dataset.referenceDate]
  );

  const fin = useMemo(
    () =>
      calculateFinancialSummary({
        rentCharges,
        expenses,
        depositTransactions: dataset.depositTransactions,
        propertyId: property.id,
        billingPeriod: selectedPeriod,
      }),
    [rentCharges, expenses, dataset.depositTransactions, property.id, selectedPeriod]
  );

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#71807B]">Property record not found.</p>
        <Link href="/dashboard/properties" className="text-xs text-[#146C63] underline mt-2 inline-block">
          Return to Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Signature Property 360° Header */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <PropertyArtwork
              propertyId={property.id}
              propertyName={property.name}
              propertyType={property.type}
              city={`${property.city}, ${property.state}`}
              heightClass="h-56 lg:h-full min-h-[220px]"
            />
          </div>
          <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-[#71807B] dark:text-[#9CB0AA]">
                  {property.code} · {property.type} · Built {property.yearBuilt}
                </p>
                <h1 className="text-2xl font-bold tracking-tight mt-1">
                  {property.name}
                </h1>
                <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-0.5">
                  {property.address}, {property.city}, {property.state} · {property.country}
                </p>
              </div>
              <StatusText status={property.status} />
            </div>

            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] leading-relaxed">
              {property.description}
            </p>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[#E1E9E5] dark:border-[#304540] text-xs">
              <div>
                <p className="text-[#71807B]">Occupancy Rate</p>
                <p className="text-base font-bold font-mono tabular-nums text-[#059669] dark:text-[#10B981]">
                  {occ.occupancyRate}%
                </p>
                <p className="text-[11px] text-[#71807B] font-mono">
                  {occ.occupiedUnits}/{occ.totalUnits} units
                </p>
              </div>
              <div>
                <p className="text-[#71807B]">Scheduled Rent</p>
                <p className="text-base font-bold font-mono tabular-nums">
                  {formatCurrency(fin.scheduledRent)}
                </p>
              </div>
              <div>
                <p className="text-[#71807B]">Collected Rent</p>
                <p className="text-base font-bold font-mono tabular-nums text-[#146C63] dark:text-[#5BC4B4]">
                  {formatCurrency(fin.collectedRent)}
                </p>
              </div>
              <div>
                <p className="text-[#71807B]">Outstanding Balance</p>
                <p className="text-base font-bold font-mono tabular-nums text-[#DC2626] dark:text-[#EF4444]">
                  {formatCurrency(fin.outstandingRent)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link
                href={`/dashboard/units/explorer?propertyId=${property.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#146C63] text-white text-xs font-medium"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Building & Floor Explorer</span>
              </Link>
              <button
                type="button"
                onClick={() => setQuickModal('add-unit')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium hover:bg-[#F8FAF9] dark:hover:bg-[#203530]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Unit</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickModal('create-lease')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium hover:bg-[#F8FAF9] dark:hover:bg-[#203530]"
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>New Lease</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickModal('create-maintenance')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium hover:bg-[#F8FAF9] dark:hover:bg-[#203530]"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Log Work Order</span>
              </button>
            </div>
          </div>
        </div>

        {/* 10 Interactive Workspace Tabs */}
        <div className="px-6 border-t border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3">
            <h2 className="text-sm font-semibold">Occupancy Breakdown</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#71807B]">Total Physical Units</span>
                <span className="font-mono font-semibold">{occ.totalUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Eligible Leasable Units</span>
                <span className="font-mono font-semibold">{occ.totalEligibleLeasableUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Occupied Units</span>
                <span className="font-mono font-semibold text-[#059669]">{occ.occupiedUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Vacant Units</span>
                <span className="font-mono font-semibold">{occ.vacantUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Reserved (Future Scheduled Lease)</span>
                <span className="font-mono font-semibold">{occ.reservedUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Under Maintenance / Unavailable</span>
                <span className="font-mono font-semibold">
                  {occ.underMaintenanceUnits + occ.unavailableUnits}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3">
            <h2 className="text-sm font-semibold">Financial Performance ({selectedPeriod})</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#71807B]">Scheduled Rent</span>
                <span className="font-mono font-semibold">{formatCurrency(fin.scheduledRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Collected Rent</span>
                <span className="font-mono font-semibold text-[#059669]">
                  {formatCurrency(fin.collectedRent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Outstanding Rent</span>
                <span className="font-mono font-semibold text-[#DC2626]">
                  {formatCurrency(fin.outstandingRent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71807B]">Paid Operating Expenses</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(fin.paidOperatingExpenses)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E1E9E5] dark:border-[#304540]">
                <span className="font-semibold">Operating Cash Flow</span>
                <span className="font-mono font-bold text-[#146C63] dark:text-[#5BC4B4]">
                  {formatCurrency(fin.operatingCashFlow)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3">
            <h2 className="text-sm font-semibold">Amenities & Management Notes</h2>
            <div className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
              {property.amenities.join(' · ')}
            </div>
            <p className="text-xs text-[#1C2927] dark:text-[#F7FAF8] pt-2 border-t border-[#E1E9E5] dark:border-[#304540]">
              {property.notes}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'Units' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Unit #</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Bed / Bath / SqFt</th>
                <th className="py-3 px-4 text-right">Asking Rent</th>
                <th className="py-3 px-4">Derived Status</th>
                <th className="py-3 px-4">Current Tenant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {units.map((u) => {
                const derived = deriveUnitOccupancyStatus(u, leases, dataset.referenceDate);
                const tenant = derived.activeLease
                  ? dataset.tenants.find((t) => t.id === derived.activeLease?.tenantId)
                  : undefined;
                return (
                  <tr key={u.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                    <td className="py-3 px-4 font-mono font-semibold">Unit {u.unitNumber}</td>
                    <td className="py-3 px-4 font-mono">Floor {u.floorNumber}</td>
                    <td className="py-3 px-4">{u.type}</td>
                    <td className="py-3 px-4 font-mono">
                      {u.bedrooms}BR · {u.bathrooms}BA · {u.sqFt} sf
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(u.askingRent)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={derived.status} />
                    </td>
                    <td className="py-3 px-4">
                      {tenant ? (
                        <Link
                          href={`/dashboard/tenants/${tenant.id}`}
                          className="text-[#146C63] dark:text-[#5BC4B4] hover:underline font-medium"
                        >
                          {tenant.fullName}
                        </Link>
                      ) : (
                        <span className="text-[#71807B]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Tenants' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Email & Phone</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Move-In Date</th>
                <th className="py-3 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {tenants.map((t) => {
                const l = activeLeases.find((item) => item.tenantId === t.id);
                const u = units.find((item) => item.id === l?.unitId);
                return (
                  <tr key={t.id}>
                    <td className="py-3 px-4 font-semibold">
                      {t.fullName}{' '}
                      <span className="font-mono text-[#71807B]">({t.code})</span>
                    </td>
                    <td className="py-3 px-4 text-[#71807B]">
                      {t.email} · {t.phone}
                    </td>
                    <td className="py-3 px-4 font-mono">Unit {u?.unitNumber}</td>
                    <td className="py-3 px-4 font-mono">{t.moveInDate}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/tenants/${t.id}`}
                        className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                      >
                        Tenant 360° →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Leases' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Lease ID</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Half-Open Interval [Start, End)</th>
                <th className="py-3 px-4 text-right">Monthly Rent</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {leases.map((l) => {
                const u = units.find((item) => item.id === l.unitId);
                const t = dataset.tenants.find((item) => item.id === l.tenantId);
                return (
                  <tr key={l.id}>
                    <td className="py-3 px-4 font-mono font-semibold">{l.code}</td>
                    <td className="py-3 px-4 font-mono">Unit {u?.unitNumber}</td>
                    <td className="py-3 px-4">{t?.fullName}</td>
                    <td className="py-3 px-4 font-mono">
                      [{l.startDate}, {l.endDate})
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(l.monthlyRent)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={l.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/leases/${l.id}`}
                        className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                      >
                        Inspect Lease →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Rent Collection' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Unit / Tenant</th>
                <th className="py-3 px-4 text-right">Scheduled</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {rentCharges.slice(0, 30).map((c) => {
                const u = units.find((item) => item.id === c.unitId);
                const t = dataset.tenants.find((item) => item.id === c.tenantId);
                return (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-mono font-semibold">{c.code}</td>
                    <td className="py-3 px-4 font-mono">{c.billingPeriod}</td>
                    <td className="py-3 px-4">
                      Unit {u?.unitNumber} · {t?.fullName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669]">
                      {formatCurrency(c.amountPaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(c.balance)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={c.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Maintenance' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Work Order</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-right">Est / Actual Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {maintenance.map((m) => {
                const u = units.find((item) => item.id === m.unitId);
                return (
                  <tr key={m.id}>
                    <td className="py-3 px-4 font-mono font-semibold">{m.code}</td>
                    <td className="py-3 px-4 font-mono">Unit {u?.unitNumber}</td>
                    <td className="py-3 px-4 font-medium">{m.title}</td>
                    <td className="py-3 px-4">{m.category}</td>
                    <td className="py-3 px-4">
                      <StatusText status={m.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={m.stage} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(m.estimatedCost)} / {formatCurrency(m.actualCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Expenses' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 px-4 font-mono font-semibold">{e.code}</td>
                  <td className="py-3 px-4 font-mono">{e.date}</td>
                  <td className="py-3 px-4">{e.category}</td>
                  <td className="py-3 px-4">{e.description}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Inspections' && (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Inspection ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {inspections.map((i) => (
                <tr key={i.id}>
                  <td className="py-3 px-4 font-mono font-semibold">{i.code}</td>
                  <td className="py-3 px-4 font-mono">{i.date}</td>
                  <td className="py-3 px-4">{i.type}</td>
                  <td className="py-3 px-4">{i.inspectorName}</td>
                  <td className="py-3 px-4">
                    <StatusText status={i.status} />
                  </td>
                  <td className="py-3 px-4 text-[#71807B]">{i.overallNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Documents & Links' && (
        <div className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-4">
          <h2 className="text-sm font-semibold">Sample Lease Agreements & Building Dossiers</h2>
          <p className="text-xs text-[#71807B]">
            All generated PDFs are watermarked &ldquo;SAMPLE LEASE — NOT A LEGAL AGREEMENT&rdquo; and generated client-side.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLeases.slice(0, 6).map((l) => {
              const u = units.find((item) => item.id === l.unitId);
              const t = dataset.tenants.find((item) => item.id === l.tenantId);
              if (!u || !t) return null;
              return (
                <div
                  key={l.id}
                  className="p-4 rounded-lg border border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-semibold">
                      {l.code} — Unit {u.unitNumber} ({t.fullName})
                    </p>
                    <p className="text-[#71807B] font-mono">
                      [{l.startDate}, {l.endDate}) · {formatCurrency(l.monthlyRent)}/mo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      generateSampleLeasePdf({
                        lease: l,
                        property,
                        unit: u,
                        tenant: t,
                        companyName: settings.companyName,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#146C63] text-white font-medium shrink-0"
                  >
                    Download Sample PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'Activity' && (
        <div className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3">
          <h2 className="text-sm font-semibold">Property Event Log</h2>
          {activities.length === 0 ? (
            <p className="text-xs text-[#71807B]">No recent property events recorded.</p>
          ) : (
            <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {activities.map((a) => (
                <div key={a.id} className="py-3 text-xs flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-[#71807B] mt-0.5">{a.description}</p>
                  </div>
                  <span className="font-mono text-[#71807B] shrink-0">
                    {a.timestamp.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
