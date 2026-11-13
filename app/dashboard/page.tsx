'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  ArrowRight,
  Building2,
  CreditCard,
  DoorOpen,
  FileSignature,
  Plus,
  Wrench,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { calculateOccupancySummary } from '@/lib/engines/occupancy-engine';
import { calculateFinancialSummary } from '@/lib/engines/financial-engine';
import { formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import { PropertyArtwork } from '@/components/ui/PropertyArtwork';

export default function DashboardOverviewPage() {
  const { dataset, selectedPropertyId, selectedPeriod, setQuickModal } =
    useEstaviaStore();

  const activeProperties = useMemo(
    () =>
      dataset.properties.filter(
        (p) =>
          !p.archived &&
          (selectedPropertyId === 'all' || p.id === selectedPropertyId)
      ),
    [dataset.properties, selectedPropertyId]
  );

  const scopedUnits = useMemo(
    () =>
      dataset.units.filter(
        (u) =>
          !u.archived &&
          (selectedPropertyId === 'all' || u.propertyId === selectedPropertyId)
      ),
    [dataset.units, selectedPropertyId]
  );

  const scopedLeases = useMemo(
    () =>
      dataset.leases.filter(
        (l) =>
          selectedPropertyId === 'all' || l.propertyId === selectedPropertyId
      ),
    [dataset.leases, selectedPropertyId]
  );

  const occ = useMemo(
    () =>
      calculateOccupancySummary(
        scopedUnits,
        scopedLeases,
        dataset.referenceDate
      ),
    [scopedUnits, scopedLeases, dataset.referenceDate]
  );

  const fin = useMemo(
    () =>
      calculateFinancialSummary({
        rentCharges: dataset.rentCharges,
        expenses: dataset.expenses,
        depositTransactions: dataset.depositTransactions,
        propertyId: selectedPropertyId,
        billingPeriod: selectedPeriod,
      }),
    [
      dataset.rentCharges,
      dataset.expenses,
      dataset.depositTransactions,
      selectedPropertyId,
      selectedPeriod,
    ]
  );

  const activeLeasesCount = useMemo(
    () => scopedLeases.filter((l) => l.status === 'Active').length,
    [scopedLeases]
  );

  const expiringLeases = useMemo(
    () =>
      scopedLeases.filter(
        (l) =>
          l.status === 'Active' &&
          l.endDate >= dataset.referenceDate &&
          l.endDate <= '2027-02-01'
      ),
    [scopedLeases, dataset.referenceDate]
  );

  const openMaintenance = useMemo(
    () =>
      dataset.maintenanceRequests.filter(
        (m) =>
          (selectedPropertyId === 'all' || m.propertyId === selectedPropertyId) &&
          m.stage !== 'Resolved' &&
          m.stage !== 'Closed' &&
          m.stage !== 'Cancelled'
      ),
    [dataset.maintenanceRequests, selectedPropertyId]
  );

  const portfolioValue = useMemo(
    () =>
      activeProperties.reduce((sum, p) => sum + (p.estimatedValue || 0), 0),
    [activeProperties]
  );

  // Rent Collection & Expenses Trend (Jun - Nov 2026)
  const monthlyTrendData = useMemo(() => {
    const periods = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
    return periods.map((period) => {
      const mFin = calculateFinancialSummary({
        rentCharges: dataset.rentCharges,
        expenses: dataset.expenses,
        depositTransactions: dataset.depositTransactions,
        propertyId: selectedPropertyId,
        billingPeriod: period,
      });
      return {
        period: period.slice(5) === '06' ? 'Jun' : period.slice(5) === '07' ? 'Jul' : period.slice(5) === '08' ? 'Aug' : period.slice(5) === '09' ? 'Sep' : period.slice(5) === '10' ? 'Oct' : 'Nov',
        scheduled: mFin.scheduledRent,
        collected: mFin.collectedRent,
        expenses: mFin.paidOperatingExpenses,
      };
    });
  }, [dataset, selectedPropertyId]);

  // Property Performance Breakdown
  const propertyPerformanceData = useMemo(() => {
    return activeProperties.slice(0, 6).map((prop) => {
      const pUnits = dataset.units.filter((u) => !u.archived && u.propertyId === prop.id);
      const pOcc = calculateOccupancySummary(pUnits, dataset.leases, dataset.referenceDate);
      const pFin = calculateFinancialSummary({
        rentCharges: dataset.rentCharges,
        expenses: dataset.expenses,
        depositTransactions: dataset.depositTransactions,
        propertyId: prop.id,
        billingPeriod: selectedPeriod,
      });
      return {
        name: prop.name.split(' ').slice(0, 2).join(' '),
        occupancy: pOcc.occupancyRate,
        collected: pFin.collectedRent,
        outstanding: pFin.outstandingRent,
      };
    });
  }, [activeProperties, dataset, selectedPeriod]);

  const overdueCharges = useMemo(
    () =>
      dataset.rentCharges
        .filter(
          (c) =>
            c.status === 'Overdue' &&
            (selectedPropertyId === 'all' || c.propertyId === selectedPropertyId)
        )
        .slice(0, 6),
    [dataset.rentCharges, selectedPropertyId]
  );

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Property Operations Overview
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Live metrics derived from local portfolio records · Period:{' '}
            <span className="font-mono">{selectedPeriod === 'all' ? '12 Months' : selectedPeriod}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setQuickModal('add-property')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] hover:bg-[#E9F5F1] dark:hover:bg-[#203530] text-xs font-medium whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#146C63] dark:text-[#5BC4B4]" />
            <span>Add Property</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickModal('create-lease')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] hover:bg-[#E9F5F1] dark:hover:bg-[#203530] text-xs font-medium whitespace-nowrap"
          >
            <FileSignature className="w-3.5 h-3.5 text-[#146C63] dark:text-[#5BC4B4]" />
            <span>Create Lease</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickModal('record-payment')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium whitespace-nowrap"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (12 Executive Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Properties / Units</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-1">
            {activeProperties.length} / {occ.totalUnits}
          </p>
          <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA] mt-1">
            {occ.totalEligibleLeasableUnits} eligible leasable
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Occupancy Rate</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#059669] dark:text-[#10B981] mt-1">
            {occ.occupancyRate}%
          </p>
          <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA] mt-1">
            {occ.occupiedUnits} occupied · {occ.vacantUnits} vacant
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Scheduled Rent</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-1">
            {formatCurrency(fin.scheduledRent)}
          </p>
          <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Collection rate: {fin.collectionRate}%
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Rent Collected</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#146C63] dark:text-[#5BC4B4] mt-1">
            {formatCurrency(fin.collectedRent)}
          </p>
          <p className="text-[11px] text-[#DC2626] dark:text-[#EF4444] mt-1 font-mono">
            {formatCurrency(fin.outstandingRent)} outstanding
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Active / Expiring Leases</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-1">
            {activeLeasesCount} / {expiringLeases.length}
          </p>
          <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Next 90 days expiration window
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Open Work Orders</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#D97706] dark:text-[#F59E0B] mt-1">
            {openMaintenance.length}
          </p>
          <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA] mt-1 font-mono">
            Est. Portfolio: ${(portfolioValue / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rent Collection vs Expenses Trend */}
        <div className="lg:col-span-7 p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">
                Rent Collection & Operating Expenses Trend
              </h2>
              <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                Scheduled rent vs actual collected cash receipts and paid expenses
              </p>
            </div>
            <Link
              href="/dashboard/rent"
              className="text-xs font-medium text-[#146C63] dark:text-[#5BC4B4] hover:underline"
            >
              Open Rent Roll →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E9E5" opacity={0.4} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => formatCurrency(Number(val ?? 0))}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E1E9E5',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scheduled"
                  name="Scheduled Rent"
                  stroke="#C99B58"
                  fill="#C99B58"
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected Rent"
                  stroke="#146C63"
                  fill="#146C63"
                  fillOpacity={0.22}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Property Occupancy & Collection Comparison */}
        <div className="lg:col-span-5 p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Property Occupancy Rate (%)</h2>
              <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                Occupied units / eligible leasable units per property
              </p>
            </div>
            <Link
              href="/dashboard/occupancy"
              className="text-xs font-medium text-[#146C63] dark:text-[#5BC4B4] hover:underline"
            >
              Occupancy View →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E9E5" opacity={0.4} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => `${Number(v ?? 0)}%`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E1E9E5',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="occupancy"
                  name="Occupancy %"
                  fill="#146C63"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Tables: Overdue Rent, Upcoming Lease Expirations, Open Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overdue Rent */}
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between">
              <h3 className="text-sm font-semibold">Overdue Rent Balances</h3>
              <Link
                href="/dashboard/rent"
                className="text-xs text-[#146C63] dark:text-[#5BC4B4] hover:underline"
              >
                Collect Rent
              </Link>
            </div>
            <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {overdueCharges.length === 0 ? (
                <p className="p-5 text-xs text-[#71807B]">
                  No overdue rent charges for the current selection.
                </p>
              ) : (
                overdueCharges.map((c) => {
                  const ten = dataset.tenants.find((t) => t.id === c.tenantId);
                  const unit = dataset.units.find((u) => u.id === c.unitId);
                  return (
                    <div
                      key={c.id}
                      className="px-5 py-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/tenants/${c.tenantId}`}
                          className="font-medium hover:underline truncate block"
                        >
                          {ten?.fullName || 'Resident'}
                        </Link>
                        <span className="text-[#71807B] dark:text-[#9CB0AA] font-mono">
                          Unit {unit?.unitNumber} · {c.billingPeriod}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-semibold text-[#DC2626] dark:text-[#EF4444] tabular-nums">
                          {formatCurrency(c.balance)}
                        </p>
                        <StatusText status={c.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Lease Expirations */}
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between">
              <h3 className="text-sm font-semibold">Upcoming Lease Expirations</h3>
              <Link
                href="/dashboard/leases"
                className="text-xs text-[#146C63] dark:text-[#5BC4B4] hover:underline"
              >
                Manage Leases
              </Link>
            </div>
            <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {expiringLeases.slice(0, 6).map((l) => {
                const ten = dataset.tenants.find((t) => t.id === l.tenantId);
                const unit = dataset.units.find((u) => u.id === l.unitId);
                return (
                  <div
                    key={l.id}
                    className="px-5 py-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/leases/${l.id}`}
                        className="font-medium hover:underline truncate block"
                      >
                        {ten?.fullName} ({l.code})
                      </Link>
                      <span className="text-[#71807B] dark:text-[#9CB0AA]">
                        Unit {unit?.unitNumber} · {formatCurrency(l.monthlyRent)}/mo
                      </span>
                    </div>
                    <div className="text-right shrink-0 font-mono text-xs text-[#D97706] dark:text-[#F59E0B]">
                      Ends {l.endDate}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Open Maintenance Work Orders */}
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between">
              <h3 className="text-sm font-semibold">Active Maintenance Queue</h3>
              <Link
                href="/dashboard/maintenance"
                className="text-xs text-[#146C63] dark:text-[#5BC4B4] hover:underline"
              >
                Open Kanban
              </Link>
            </div>
            <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {openMaintenance.slice(0, 6).map((m) => {
                const unit = dataset.units.find((u) => u.id === m.unitId);
                return (
                  <div
                    key={m.id}
                    className="px-5 py-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <Link
                        href="/dashboard/maintenance"
                        className="font-medium hover:underline truncate block"
                      >
                        {m.title}
                      </Link>
                      <span className="text-[#71807B] dark:text-[#9CB0AA] font-mono">
                        {m.code} · Unit {unit?.unitNumber} · {m.category}
                      </span>
                    </div>
                    <StatusText status={m.priority} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Properties Strip */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Portfolio Properties</h2>
          <Link
            href="/dashboard/portfolio"
            className="text-xs font-medium text-[#146C63] dark:text-[#5BC4B4] hover:underline inline-flex items-center gap-1"
          >
            <span>View Full Portfolio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {activeProperties.slice(0, 4).map((prop) => {
            const pUnits = dataset.units.filter((u) => !u.archived && u.propertyId === prop.id);
            const pOcc = calculateOccupancySummary(pUnits, dataset.leases, dataset.referenceDate);
            const pFin = calculateFinancialSummary({
              rentCharges: dataset.rentCharges,
              expenses: dataset.expenses,
              depositTransactions: dataset.depositTransactions,
              propertyId: prop.id,
              billingPeriod: selectedPeriod,
            });
            return (
              <Link
                key={prop.id}
                href={`/dashboard/properties/${prop.id}`}
                className="group rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden hover:border-[#146C63] transition-colors flex flex-col justify-between"
              >
                <PropertyArtwork
                  propertyId={prop.id}
                  propertyName={prop.name}
                  propertyType={prop.type}
                  city={`${prop.city}, ${prop.state}`}
                  heightClass="h-36"
                />
                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-[#71807B] dark:text-[#9CB0AA]">
                    <span className="font-mono">{prop.code}</span>
                    <span className="font-mono font-semibold text-[#059669] dark:text-[#10B981]">
                      {pOcc.occupancyRate}% Occupied
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E1E9E5] dark:border-[#304540]">
                    <span className="text-[#71807B] dark:text-[#9CB0AA]">
                      {pOcc.occupiedUnits}/{pOcc.totalUnits} Units
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatCurrency(pFin.scheduledRent)}/mo
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
