'use client';

import React, { useMemo, useState } from 'react';
import { Archive, Plus, Search } from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { formatCurrency } from '@/lib/export/exporter';
import { Vendor } from '@/lib/types';

export default function VendorsDirectoryPage() {
  const { dataset, addVendor, archiveVendor } = useEstaviaStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [vName, setVName] = useState('');
  const [vCat, setVCat] = useState<Vendor['category']>('HVAC');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('+1 (800) 555-0192');
  const [vRate, setVRate] = useState(135);

  const enrichedVendors = useMemo(() => {
    return dataset.vendors
      .filter((v) => !v.archived)
      .map((vendor) => {
        const requests = dataset.maintenanceRequests.filter(
          (m) => m.vendorId === vendor.id
        );
        const completed = requests.filter(
          (m) => m.stage === 'Resolved' || m.stage === 'Closed'
        ).length;
        const estTotal = requests.reduce((s, m) => s + m.estimatedCost, 0);
        const recordedExpenses = dataset.expenses
          .filter((e) => !e.archived && e.vendorId === vendor.id)
          .reduce((s, e) => s + e.amount, 0);
        return {
          vendor,
          assignedCount: requests.length,
          completedCount: completed,
          estTotal,
          recordedExpenses,
        };
      });
  }, [dataset]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedVendors.filter(
      ({ vendor }) =>
        !q ||
        vendor.businessName.toLowerCase().includes(q) ||
        vendor.category.toLowerCase().includes(q) ||
        vendor.contactName.toLowerCase().includes(q)
    );
  }, [enrichedVendors, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Directory</h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Fictional contractor and building service vendors linked to maintenance work orders and recorded expenses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vendor</span>
        </button>
      </div>

      <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name, trade category..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Vendor</th>
              <th className="py-3 px-4">Trade Category</th>
              <th className="py-3 px-4">Fictional Contact</th>
              <th className="py-3 px-4 text-right">Assigned / Completed WOs</th>
              <th className="py-3 px-4 text-right">Estimated WO Costs</th>
              <th className="py-3 px-4 text-right">Recorded Expenses</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.map(
              ({
                vendor,
                assignedCount,
                completedCount,
                estTotal,
                recordedExpenses,
              }) => (
                <tr key={vendor.id}>
                  <td className="py-3 px-4 font-semibold">
                    {vendor.businessName}
                    <span className="block text-[11px] font-mono text-[#71807B]">
                      {vendor.code} · ${vendor.hourlyRate}/hr
                    </span>
                  </td>
                  <td className="py-3 px-4">{vendor.category}</td>
                  <td className="py-3 px-4 text-[#71807B]">
                    {vendor.contactName} · {vendor.phone}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {assignedCount} / {completedCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(estTotal)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                    {formatCurrency(recordedExpenses)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => archiveVendor(vendor.id)}
                      className="p-1 text-[#71807B] hover:text-[#DC2626]"
                      title="Archive Vendor"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">Add Service Vendor</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                addVendor({
                  businessName: vName,
                  category: vCat,
                  contactName: vContact || 'Service Dispatch',
                  email: vEmail || 'dispatch@vendor.demo',
                  phone: vPhone,
                  hourlyRate: Number(vRate),
                  rating: 4.9,
                });
                setShowAdd(false);
              }}
            >
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="Summit Elevator & Mechanical"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Category</label>
                  <select
                    value={vCat}
                    onChange={(e) => setVCat(e.target.value as Vendor['category'])}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="HVAC">HVAC</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Structural">Structural</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="Cleaning">Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#71807B] mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    value={vRate}
                    onChange={(e) => setVRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] text-white"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
