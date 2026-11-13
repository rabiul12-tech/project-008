'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  Edit3,
  Plus,
  Search,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import { Tenant } from '@/lib/types';

export default function TenantsDirectoryPage() {
  const { dataset, setQuickModal, updateTenant, archiveTenant } =
    useEstaviaStore();

  const [search, setSearch] = useState('');
  const [leaseFilter, setLeaseFilter] = useState<'all' | 'active' | 'overdue'>('all');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const enrichedTenants = useMemo(() => {
    return dataset.tenants
      .filter((t) => !t.archived)
      .map((tenant) => {
        const activeLease = dataset.leases.find(
          (l) => l.tenantId === tenant.id && l.status === 'Active'
        );
        const unit = activeLease
          ? dataset.units.find((u) => u.id === activeLease.unitId)
          : undefined;
        const property = activeLease
          ? dataset.properties.find((p) => p.id === activeLease.propertyId)
          : undefined;
        const outstandingBalance = dataset.rentCharges
          .filter((c) => c.tenantId === tenant.id && c.status !== 'Voided')
          .reduce((sum, c) => sum + c.balance, 0);
        return {
          tenant,
          activeLease,
          unit,
          property,
          outstandingBalance,
        };
      });
  }, [dataset]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedTenants.filter(({ tenant, activeLease, unit, property, outstandingBalance }) => {
      if (leaseFilter === 'active' && !activeLease) return false;
      if (leaseFilter === 'overdue' && outstandingBalance <= 0) return false;
      if (
        q &&
        !tenant.fullName.toLowerCase().includes(q) &&
        !tenant.code.toLowerCase().includes(q) &&
        !tenant.email.toLowerCase().includes(q) &&
        !unit?.unitNumber.toLowerCase().includes(q) &&
        !property?.name.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [enrichedTenants, search, leaseFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Directory</h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Fictional demonstration resident records connected to units, leases, rent ledgers, and maintenance history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setQuickModal('add-tenant')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Tenant</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant name, ID, email, unit, property..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D] border border-[#E1E9E5] dark:border-[#304540]">
          {[
            { id: 'all', label: 'All Tenants' },
            { id: 'active', label: 'Active Lease' },
            { id: 'overdue', label: 'With Balance Due' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLeaseFilter(tab.id as typeof leaseFilter)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                leaseFilter === tab.id
                  ? 'bg-white dark:bg-[#203530] text-[#1C2927] dark:text-white shadow-sm'
                  : 'text-[#71807B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Tenant</th>
              <th className="py-3 px-4">Fictional Contact</th>
              <th className="py-3 px-4">Property & Unit</th>
              <th className="py-3 px-4">Lease Status</th>
              <th className="py-3 px-4">Move-In Date</th>
              <th className="py-3 px-4 text-right">Outstanding Balance</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.slice(0, 75).map(({ tenant, activeLease, unit, property, outstandingBalance }) => (
              <tr key={tenant.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                <td className="py-3 px-4">
                  <Link
                    href={`/dashboard/tenants/${tenant.id}`}
                    className="font-semibold text-[#1C2927] dark:text-[#F7FAF8] hover:text-[#146C63] dark:hover:text-[#5BC4B4]"
                  >
                    {tenant.fullName}
                  </Link>
                  <span className="block text-[11px] font-mono text-[#71807B]">
                    {tenant.code} · {tenant.occupation}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#71807B]">
                  <span className="block">{tenant.email}</span>
                  <span className="font-mono text-[11px]">{tenant.phone}</span>
                </td>
                <td className="py-3 px-4">
                  {property && unit ? (
                    <div>
                      <span className="font-medium">{property.name}</span>
                      <span className="block font-mono text-[11px] text-[#71807B]">
                        Unit {unit.unitNumber}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#71807B]">No Current Unit</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusText status={activeLease ? activeLease.status : 'Scheduled'} />
                </td>
                <td className="py-3 px-4 font-mono">{tenant.moveInDate || '—'}</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  <span
                    className={
                      outstandingBalance > 0
                        ? 'font-semibold text-[#DC2626] dark:text-[#EF4444]'
                        : 'text-[#059669] dark:text-[#10B981]'
                    }
                  >
                    {formatCurrency(outstandingBalance)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/dashboard/tenants/${tenant.id}`}
                      className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                    >
                      360° Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditingTenant(tenant)}
                      className="p-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                      title="Edit Tenant"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveTenant(tenant.id)}
                      className="p-1 text-[#71807B] hover:text-[#DC2626]"
                      title="Archive Tenant"
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

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">Edit Tenant — {editingTenant.fullName}</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateTenant(editingTenant.id, editingTenant);
                setEditingTenant(null);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editingTenant.firstName}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editingTenant.lastName}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Fictional Email</label>
                <input
                  type="email"
                  required
                  value={editingTenant.email}
                  onChange={(e) =>
                    setEditingTenant({ ...editingTenant, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Fictional Phone</label>
                <input
                  type="text"
                  value={editingTenant.phone}
                  onChange={(e) =>
                    setEditingTenant({ ...editingTenant, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
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
