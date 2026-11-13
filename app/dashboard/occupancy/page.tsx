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
} from 'recharts';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  calculateOccupancySummary,
  deriveUnitOccupancyStatus,
} from '@/lib/engines/occupancy-engine';
import { formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';

export default function OccupancyManagementPage() {
  const { dataset, selectedPropertyId } = useEstaviaStore();

  const scopedUnits = useMemo(
    () =>
      dataset.units.filter(
        (u) =>
          !u.archived &&
          (selectedPropertyId === 'all' || u.propertyId === selectedPropertyId)
      ),
    [dataset.units, selectedPropertyId]
  );

  const occ = useMemo(
    () =>
      calculateOccupancySummary(
        scopedUnits,
        dataset.leases,
        dataset.referenceDate
      ),
    [scopedUnits, dataset.leases, dataset.referenceDate]
  );

  const byPropertyData = useMemo(() => {
    return dataset.properties
      .filter((p) => !p.archived)
      .map((p) => {
        const units = dataset.units.filter(
          (u) => !u.archived && u.propertyId === p.id
        );
        const summary = calculateOccupancySummary(
          units,
          dataset.leases,
          dataset.referenceDate
        );
        return {
          id: p.id,
          name: p.name.split(' ').slice(0, 2).join(' '),
          fullName: p.name,
          occupied: summary.occupiedUnits,
          vacant: summary.vacantUnits,
          reserved: summary.reservedUnits,
          occupancyRate: summary.occupancyRate,
        };
      });
  }, [dataset]);

  const byUnitTypeData = useMemo(() => {
    const groups = new Map<string, { total: number; occupied: number }>();
    for (const u of scopedUnits) {
      const derived = deriveUnitOccupancyStatus(
        u,
        dataset.leases,
        dataset.referenceDate
      );
      const curr = groups.get(u.type) || { total: 0, occupied: 0 };
      curr.total += 1;
      if (derived.status === 'Occupied') curr.occupied += 1;
      groups.set(u.type, curr);
    }
    return Array.from(groups.entries()).map(([type, counts]) => ({
      type,
      total: counts.total,
      occupied: counts.occupied,
      rate:
        counts.total > 0
          ? Number(((counts.occupied / counts.total) * 100).toFixed(1))
          : 0,
    }));
  }, [scopedUnits, dataset.leases, dataset.referenceDate]);

  const vacantAndReservedUnits = useMemo(() => {
    return scopedUnits
      .map((u) => {
        const derived = deriveUnitOccupancyStatus(
          u,
          dataset.leases,
          dataset.referenceDate
        );
        const prop = dataset.properties.find((p) => p.id === u.propertyId);
        return { unit: u, derived, prop };
      })
      .filter((item) => item.derived.status !== 'Occupied');
  }, [scopedUnits, dataset]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Occupancy & Vacancy Management
        </h1>
        <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
          Formula: <span className="font-mono">Occupancy Rate = Occupied Leasable Units / Total Eligible Leasable Units × 100</span>. Future Scheduled leases are classified as Reserved rather than current occupants.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Eligible Leasable Units</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-1">
            {occ.totalEligibleLeasableUnits}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Occupied Units</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#059669] mt-1">
            {occ.occupiedUnits}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Vacant Units</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#146C63] dark:text-[#5BC4B4] mt-1">
            {occ.vacantUnits}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Reserved Units</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#C99B58] mt-1">
            {occ.reservedUnits}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Occupancy Rate</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#059669] mt-1">
            {occ.occupancyRate}%
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Vacancy Rate</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#D97706] mt-1">
            {occ.vacancyRate}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <h2 className="text-sm font-semibold mb-4">Occupancy Rate by Property (%)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPropertyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E9E5" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => `${Number(v ?? 0)}%`} />
                <Bar dataKey="occupancyRate" name="Occupancy %" fill="#146C63" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <h2 className="text-sm font-semibold mb-4">Occupancy by Unit Category</h2>
          <div className="space-y-3">
            {byUnitTypeData.map((row) => (
              <div key={row.type} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{row.type}</span>
                  <span className="font-mono">
                    {row.occupied}/{row.total} ({row.rate}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F8FAF9] dark:bg-[#121F1D] overflow-hidden">
                  <div
                    className="h-full bg-[#146C63] dark:bg-[#5BC4B4]"
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unit Availability Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540]">
          <h2 className="text-sm font-semibold">
            Vacant, Reserved & Unavailable Units ({vacantAndReservedUnits.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Asking Rent</th>
                <th className="py-3 px-4">Derived Availability Status</th>
                <th className="py-3 px-4">Scheduled Lease / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {vacantAndReservedUnits.map(({ unit, derived, prop }) => (
                <tr key={unit.id}>
                  <td className="py-3 px-4 font-mono font-semibold">
                    Unit {unit.unitNumber}
                  </td>
                  <td className="py-3 px-4">{prop?.name}</td>
                  <td className="py-3 px-4">
                    {unit.type} ({unit.sqFt} sf)
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(unit.askingRent)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={derived.status} />
                  </td>
                  <td className="py-3 px-4 font-mono text-[#71807B]">
                    {derived.scheduledLease
                      ? `Scheduled ${derived.scheduledLease.code} starts ${derived.scheduledLease.startDate}`
                      : 'Immediate Move-In Eligible'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
