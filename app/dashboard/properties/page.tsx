'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  Copy,
  Download,
  Edit3,
  Plus,
  Search,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { calculateOccupancySummary } from '@/lib/engines/occupancy-engine';
import { downloadCsvFile, formatCurrency } from '@/lib/export/exporter';
import { Property, PropertyStatus, PropertyType } from '@/lib/types';

export default function PropertiesManagementPage() {
  const {
    dataset,
    setQuickModal,
    updateProperty,
    archiveProperty,
    duplicateProperty,
  } = useEstaviaStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.properties.filter((p) => {
      if (statusFilter === 'active' && p.archived) return false;
      if (statusFilter === 'archived' && !p.archived) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.code.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q) &&
        !p.address.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [dataset.properties, search, statusFilter, typeFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Property Code',
      'Property Name',
      'Type',
      'Address',
      'City',
      'State',
      'Floors',
      'Total Units',
      'Occupied Units',
      'Occupancy Rate %',
      'Status',
    ];
    const rows = filtered.map((p) => {
      const units = dataset.units.filter((u) => !u.archived && u.propertyId === p.id);
      const occ = calculateOccupancySummary(units, dataset.leases, dataset.referenceDate);
      return [
        p.code,
        p.name,
        p.type,
        p.address,
        p.city,
        p.state,
        p.floorsCount,
        occ.totalUnits,
        occ.occupiedUnits,
        occ.occupancyRate,
        p.status,
      ];
    });
    downloadCsvFile('estavia-properties.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Property Directory & Management</h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Create, edit, duplicate, export, or archive properties without losing historical leases or financial ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium hover:bg-[#F8FAF9]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickModal('add-property')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, address, city..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          >
            <option value="all">All Types</option>
            <option value="Apartment Building">Apartment Building</option>
            <option value="Residential Complex">Residential Complex</option>
            <option value="Commercial Building">Commercial Building</option>
            <option value="Mixed-Use Property">Mixed-Use Property</option>
            <option value="Single-Family Rental">Single-Family Rental</option>
            <option value="Townhouse Portfolio">Townhouse Portfolio</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          >
            <option value="active">Active & Under Renovation</option>
            <option value="archived">Archived Properties</option>
            <option value="all">All Records</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono">{selectedIds.length} selected</span>
            <button
              type="button"
              onClick={() => {
                selectedIds.forEach((id) => archiveProperty(id));
                setSelectedIds([]);
              }}
              className="px-2.5 py-1 rounded bg-[#DC2626]/10 text-[#DC2626] font-medium"
            >
              Archive Selected
            </button>
          </div>
        )}
      </div>

      {/* Management Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B] dark:text-[#9CB0AA]">
              <th className="py-3 px-4 w-8">
                <input
                  type="checkbox"
                  aria-label="Select all properties"
                  checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? filtered.map((p) => p.id) : [])
                  }
                />
              </th>
              <th className="py-3 px-4">Code / Property</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Address & City</th>
              <th className="py-3 px-4 text-right">Floors</th>
              <th className="py-3 px-4 text-right">Units (Occ/Total)</th>
              <th className="py-3 px-4 text-right">Occupancy</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.map((prop) => {
              const pUnits = dataset.units.filter((u) => !u.archived && u.propertyId === prop.id);
              const occ = calculateOccupancySummary(pUnits, dataset.leases, dataset.referenceDate);
              return (
                <tr key={prop.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      aria-label={`Select ${prop.name}`}
                      checked={selectedIds.includes(prop.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, prop.id]
                            : prev.filter((id) => id !== prop.id)
                        )
                      }
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/properties/${prop.id}`}
                      className="font-semibold text-[#1C2927] dark:text-[#F7FAF8] hover:text-[#146C63] dark:hover:text-[#5BC4B4]"
                    >
                      {prop.name}
                    </Link>
                    <span className="block text-[11px] font-mono text-[#71807B]">
                      {prop.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#71807B]">{prop.type}</td>
                  <td className="py-3 px-4">
                    {prop.address}, {prop.city}, {prop.state}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {prop.floorsCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {occ.occupiedUnits} / {occ.totalUnits}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669] dark:text-[#10B981]">
                    {occ.occupancyRate}%
                  </td>
                  <td className="py-3 px-4">{prop.status}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/dashboard/properties/${prop.id}`}
                        className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                      >
                        360°
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingProperty(prop)}
                        className="p-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                        title="Edit Property"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateProperty(prop.id)}
                        className="p-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                        title="Duplicate Configuration"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!prop.archived && (
                        <button
                          type="button"
                          onClick={() => archiveProperty(prop.id)}
                          className="p-1 text-[#71807B] hover:text-[#DC2626]"
                          title="Archive Property"
                        >
                          <Archive className="w-3.5 h-3.5" />
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

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">Edit Property — {editingProperty.name}</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateProperty(editingProperty.id, editingProperty);
                setEditingProperty(null);
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Property Name</label>
                  <input
                    type="text"
                    required
                    value={editingProperty.name}
                    onChange={(e) =>
                      setEditingProperty({ ...editingProperty, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Property Type</label>
                  <select
                    value={editingProperty.type}
                    onChange={(e) =>
                      setEditingProperty({
                        ...editingProperty,
                        type: e.target.value as PropertyType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Apartment Building">Apartment Building</option>
                    <option value="Residential Complex">Residential Complex</option>
                    <option value="Commercial Building">Commercial Building</option>
                    <option value="Mixed-Use Property">Mixed-Use Property</option>
                    <option value="Single-Family Rental">Single-Family Rental</option>
                    <option value="Townhouse Portfolio">Townhouse Portfolio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Address</label>
                  <input
                    type="text"
                    value={editingProperty.address}
                    onChange={(e) =>
                      setEditingProperty({ ...editingProperty, address: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Status</label>
                  <select
                    value={editingProperty.status}
                    onChange={(e) =>
                      setEditingProperty({
                        ...editingProperty,
                        status: e.target.value as PropertyStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Active">Active</option>
                    <option value="Under Renovation">Under Renovation</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProperty.description}
                  onChange={(e) =>
                    setEditingProperty({ ...editingProperty, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
