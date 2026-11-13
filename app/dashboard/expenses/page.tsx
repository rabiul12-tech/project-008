'use client';

import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Download,
  Plus,
  Search,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { downloadCsvFile, formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';

export default function PropertyExpensesPage() {
  const {
    dataset,
    selectedPropertyId,
    setQuickModal,
    updateExpense,
    archiveExpense,
  } = useEstaviaStore();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.expenses.filter((e) => {
      if (e.archived) return false;
      if (selectedPropertyId !== 'all' && e.propertyId !== selectedPropertyId)
        return false;
      if (catFilter !== 'all' && e.category !== catFilter) return false;
      if (
        q &&
        !e.description.toLowerCase().includes(q) &&
        !e.code.toLowerCase().includes(q) &&
        !e.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [dataset.expenses, selectedPropertyId, catFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Expense Code',
      'Date',
      'Property',
      'Category',
      'Description',
      'Amount',
      'Status',
    ];
    const rows = filtered.map((e) => {
      const prop = dataset.properties.find((p) => p.id === e.propertyId);
      return [
        e.code,
        e.date,
        prop?.name,
        e.category,
        e.description,
        e.amount,
        e.status,
      ];
    });
    downloadCsvFile('estavia-property-expenses.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Property Operating Expenses
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Track repairs, utilities, insurance, property taxes, cleaning, and management disbursements.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickModal('record-expense')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
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
            placeholder="Search expense code, description..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Expense Categories</option>
          <option value="Repairs">Repairs</option>
          <option value="Utilities">Utilities</option>
          <option value="Cleaning">Cleaning</option>
          <option value="Insurance">Insurance</option>
          <option value="Property Taxes">Property Taxes</option>
          <option value="Management">Management</option>
          <option value="Landscaping">Landscaping</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Property</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {filtered.map((exp) => {
              const prop = dataset.properties.find((p) => p.id === exp.propertyId);
              return (
                <tr key={exp.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                  <td className="py-3 px-4 font-mono font-semibold">{exp.code}</td>
                  <td className="py-3 px-4 font-mono">{exp.date}</td>
                  <td className="py-3 px-4 font-medium">{prop?.name}</td>
                  <td className="py-3 px-4">{exp.category}</td>
                  <td className="py-3 px-4">{exp.description}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={exp.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      {exp.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => updateExpense(exp.id, { status: 'Paid' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#059669]/15 text-[#059669] font-medium"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mark Paid</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => archiveExpense(exp.id)}
                        className="p-1 text-[#71807B] hover:text-[#DC2626]"
                        title="Archive Expense"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
