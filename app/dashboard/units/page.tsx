'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  Building,
  Edit3,
  Plus,
  Search,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { deriveUnitOccupancyStatus } from '@/lib/engines/occupancy-engine';
import { formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import { Unit, UnitAvailabilityMode } from '@/lib/types';

export default function UnitsManagementPage() {
  const {
    dataset,
    selectedPropertyId,
    setQuickModal,
    updateUnit,
    archiveUnit,
  } = useEstaviaStore();

  const [propFilter, setPropFilter] = useState<string>(selectedPropertyId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const enrichedUnits = useMemo(() => {
    return dataset.units
      .filter((u) => !u.archived)
      .map((u) => {
        const property = dataset.properties.find((p) => p.id === u.propertyId);
        const derived = deriveUnitOccupancyStatus(u, dataset.leases, dataset.referenceDate);
        const tenant = derived.activeLease
          ? dataset.tenants.find((t) => t.id === derived.activeLease?.tenantId)
          : derived.scheduledLease
          ? dataset.tenants.find((t) => t.id === derived.scheduledLease?.tenantId)
          : undefined;
        return { unit: u, property, derived, tenant };
      });
  }, [dataset]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedUnits.filter(({ unit, property, derived, tenant }) => {
      if (propFilter !== 'all' && unit.propertyId !== propFilter) return false;
      if (statusFilter !== 'all' && derived.status !== statusFilter) return false;
      if (
        q &&
        !unit.unitNumber.toLowerCase().includes(q) &&
        !unit.type.toLowerCase().includes(q) &&
        !property?.name.toLowerCase().includes(q) &&
        !tenant?.fullName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [enrichedUnits, propFilter, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unit Inventory & Management</h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Occupancy status is derived automatically from effective active leases and unit availability rules.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/units/explorer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium hover:bg-[#F8FAF9]"
          >
            <Building className="w-3.5 h-3.5 text-[#146C63] dark:text-[#5BC4B4]" />
            <span>Interactive Building Explorer</span>
          </Link>
          <button
            type="button"
            onClick={() => setQuickModal('add-unit')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Unit</span>
          </button>
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
            placeholder="Search unit #, type, property, tenant..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>

        <select
          value={propFilter}
          onChange={(e) => setPropFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Properties</option>
          {dataset.properties
            .filter((p) => !p.archived)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Derived Statuses</option>
          <option value="Occupied">Occupied</option>
          <option value="Vacant">Vacant</option>
          <option value="Reserved">Reserved</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Unavailable">Unavailable</option>
        </select>
      </div>

      {/* Units Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4">Property</th>
              <th className="py-3 px-4">Type & Layout</th>
              <th className="py-3 px-4 text-right">Asking Rent</th>
              <th className="py-3 px-4 text-right">Current Lease Rent</th>
              <th className="py-3 px-4">Derived Occupancy</th>
              <th className="py-3 px-4">Tenant / Active Lease</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.slice(0, 80).map(({ unit, property, derived, tenant }) => (
              <tr key={unit.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                <td className="py-3 px-4 font-mono font-semibold">
                  Unit {unit.unitNumber}
                  <span className="block text-[11px] text-[#71807B]">
                    Floor {unit.floorNumber}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/dashboard/properties/${unit.propertyId}`}
                    className="font-medium hover:text-[#146C63] dark:hover:text-[#5BC4B4]"
                  >
                    {property?.name}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <span>{unit.type}</span>
                  <span className="block text-[11px] font-mono text-[#71807B]">
                    {unit.bedrooms}BR · {unit.bathrooms}BA · {unit.sqFt} sq ft
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatCurrency(unit.askingRent)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {derived.activeLease
                    ? formatCurrency(derived.activeLease.monthlyRent)
                    : '—'}
                </td>
                <td className="py-3 px-4">
                  <StatusText status={derived.status} />
                </td>
                <td className="py-3 px-4">
                  {tenant ? (
                    <div>
                      <Link
                        href={`/dashboard/tenants/${tenant.id}`}
                        className="font-medium text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                      >
                        {tenant.fullName}
                      </Link>
                      {derived.activeLease && (
                        <span className="block text-[11px] font-mono text-[#71807B]">
                          {derived.activeLease.code} (until {derived.activeLease.endDate})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#71807B]">Unassigned</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditError(null);
                        setEditingUnit(unit);
                      }}
                      className="p-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                      title="Edit Unit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveUnit(unit.id)}
                      className="p-1 text-[#71807B] hover:text-[#DC2626]"
                      title="Archive Unit"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Unit Modal */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">Edit Unit {editingUnit.unitNumber}</h2>
            {editError && (
              <p className="text-xs text-[#DC2626] bg-[#DC2626]/10 p-2.5 rounded-lg">
                {editError}
              </p>
            )}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = updateUnit(editingUnit.id, editingUnit);
                if (!res.ok) {
                  setEditError(res.error || 'Could not update unit.');
                } else {
                  setEditingUnit(null);
                }
              }}
            >
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Unit Number</label>
                <input
                  type="text"
                  required
                  value={editingUnit.unitNumber}
                  onChange={(e) =>
                    setEditingUnit({ ...editingUnit, unitNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Asking Rent ($)</label>
                <input
                  type="number"
                  value={editingUnit.askingRent}
                  onChange={(e) =>
                    setEditingUnit({ ...editingUnit, askingRent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">
                  Availability Mode (when no active lease)
                </label>
                <select
                  value={editingUnit.availabilityMode}
                  onChange={(e) =>
                    setEditingUnit({
                      ...editingUnit,
                      availabilityMode: e.target.value as UnitAvailabilityMode,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                >
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
