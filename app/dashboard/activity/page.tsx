'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';

export default function ActivityTimelinePage() {
  const { dataset } = useEstaviaStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.activities.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !a.description.toLowerCase().includes(q) &&
        !a.actor.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [dataset.activities, search, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Operational Activity Timeline
        </h1>
        <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
          Chronological audit log of property, unit, tenant, lease, payment, deposit, and maintenance actions stored in LocalStorage.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event title, description, actor..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
        >
          <option value="all">All Event Types</option>
          <option value="Property Created">Property Created</option>
          <option value="Unit Added">Unit Added</option>
          <option value="Tenant Created">Tenant Created</option>
          <option value="Lease Created">Lease Created</option>
          <option value="Lease Activated">Lease Activated</option>
          <option value="Lease Renewed">Lease Renewed</option>
          <option value="Rent Charged">Rent Charged</option>
          <option value="Payment Recorded">Payment Recorded</option>
          <option value="Maintenance Assigned">Maintenance Assigned</option>
          <option value="Maintenance Closed">Maintenance Closed</option>
        </select>
      </div>

      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] divide-y divide-[#E1E9E5] dark:divide-[#304540]">
        {filtered.map((act) => (
          <div
            key={act.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[#146C63] dark:text-[#5BC4B4] font-semibold">
                  {act.type}
                </span>
                <span className="text-[#71807B]">·</span>
                <span className="font-semibold text-[#1C2927] dark:text-[#F7FAF8]">
                  {act.title}
                </span>
              </div>
              <p className="text-[#71807B] dark:text-[#9CB0AA]">{act.description}</p>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#71807B]">Actor: {act.actor}</span>
                {act.propertyId && (
                  <Link
                    href={`/dashboard/properties/${act.propertyId}`}
                    className="text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                  >
                    Open Property →
                  </Link>
                )}
                {act.leaseId && (
                  <Link
                    href={`/dashboard/leases/${act.leaseId}`}
                    className="text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                  >
                    Open Lease →
                  </Link>
                )}
              </div>
            </div>
            <span className="font-mono text-[#71807B] shrink-0">
              {act.timestamp.slice(0, 16).replace('T', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
