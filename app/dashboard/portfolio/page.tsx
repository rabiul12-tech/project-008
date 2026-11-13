'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  Building,
  CheckSquare,
  Grid,
  List,
  Plus,
  Search,
  Square,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { calculateOccupancySummary } from '@/lib/engines/occupancy-engine';
import { calculateFinancialSummary } from '@/lib/engines/financial-engine';
import { formatCurrency } from '@/lib/export/exporter';
import { PropertyArtwork } from '@/components/ui/PropertyArtwork';
import { PropertyType } from '@/lib/types';

export default function PortfolioWorkspacePage() {
  const { dataset, selectedPeriod, setQuickModal } = useEstaviaStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'occupancy' | 'rent'>('rent');
  const [compareIds, setCompareIds] = useState<string[]>(['prop-1', 'prop-2']);

  const enrichedProperties = useMemo(() => {
    return dataset.properties
      .filter((p) => !p.archived)
      .map((prop) => {
        const pUnits = dataset.units.filter(
          (u) => !u.archived && u.propertyId === prop.id
        );
        const occ = calculateOccupancySummary(
          pUnits,
          dataset.leases,
          dataset.referenceDate
        );
        const fin = calculateFinancialSummary({
          rentCharges: dataset.rentCharges,
          expenses: dataset.expenses,
          depositTransactions: dataset.depositTransactions,
          propertyId: prop.id,
          billingPeriod: selectedPeriod,
        });
        const openMaint = dataset.maintenanceRequests.filter(
          (m) =>
            m.propertyId === prop.id &&
            m.stage !== 'Resolved' &&
            m.stage !== 'Closed' &&
            m.stage !== 'Cancelled'
        ).length;
        return { prop, occ, fin, openMaint };
      });
  }, [dataset, selectedPeriod]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedProperties
      .filter(({ prop }) => {
        if (typeFilter !== 'all' && prop.type !== typeFilter) return false;
        if (
          q &&
          !prop.name.toLowerCase().includes(q) &&
          !prop.city.toLowerCase().includes(q) &&
          !prop.code.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.prop.name.localeCompare(b.prop.name);
        if (sortBy === 'occupancy') return b.occ.occupancyRate - a.occ.occupancyRate;
        return b.fin.scheduledRent - a.fin.scheduledRent;
      });
  }, [enrichedProperties, search, typeFilter, sortBy]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev.slice(-3), id]
    );
  };

  const comparedItems = useMemo(
    () => enrichedProperties.filter((item) => compareIds.includes(item.prop.id)),
    [enrichedProperties, compareIds]
  );

  const propertyTypes: PropertyType[] = [
    'Apartment Building',
    'Residential Complex',
    'Commercial Building',
    'Mixed-Use Property',
    'Single-Family Rental',
    'Townhouse Portfolio',
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Property Portfolio Workspace
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Compare architectural assets, occupancy performance, monthly rent rolls, and maintenance load.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setQuickModal('add-property')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium whitespace-nowrap self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Filter & View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by property name, city, or code..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
            />
          </div>

          <select
            aria-label="Filter by Property Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
          >
            <option value="all">All Property Types</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#71807B]" />
            <select
              aria-label="Sort Properties"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
            >
              <option value="rent">Sort: Monthly Rent Roll</option>
              <option value="occupancy">Sort: Occupancy Rate</option>
              <option value="name">Sort: Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Segmented View Switch */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D] border border-[#E1E9E5] dark:border-[#304540]">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-[#203530] text-[#1C2927] dark:text-white shadow-sm'
                : 'text-[#71807B]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-[#203530] text-[#1C2927] dark:text-white shadow-sm'
                : 'text-[#71807B]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Property Comparison Matrix (When 2+ selected) */}
      {comparedItems.length >= 2 && (
        <div className="p-5 rounded-xl border border-[#146C63]/40 bg-[#E9F5F1]/60 dark:bg-[#16302B]/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-[#146C63] dark:text-[#5BC4B4]">
              Side-by-Side Portfolio Comparison ({comparedItems.length} Selected)
            </h2>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-[#71807B] hover:underline"
            >
              Clear Comparison
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                  <th className="py-2 pr-4">Property</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-right">Units (Occ/Total)</th>
                  <th className="py-2 px-3 text-right">Occupancy %</th>
                  <th className="py-2 px-3 text-right">Scheduled Rent</th>
                  <th className="py-2 px-3 text-right">Collected</th>
                  <th className="py-2 pl-3 text-right">Operating Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
                {comparedItems.map(({ prop, occ, fin }) => (
                  <tr key={prop.id}>
                    <td className="py-2.5 pr-4 font-semibold">{prop.name}</td>
                    <td className="py-2.5 px-3 text-[#71807B]">{prop.type}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {occ.occupiedUnits} / {occ.totalUnits}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#059669] dark:text-[#10B981]">
                      {occ.occupancyRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatCurrency(fin.scheduledRent)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatCurrency(fin.collectedRent)}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono font-semibold tabular-nums">
                      {formatCurrency(fin.operatingCashFlow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid or List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(({ prop, occ, fin, openMaint }) => {
            const isCompared = compareIds.includes(prop.id);
            return (
              <div
                key={prop.id}
                className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <PropertyArtwork
                    propertyId={prop.id}
                    propertyName={prop.name}
                    propertyType={prop.type}
                    city={`${prop.city}, ${prop.state}`}
                    heightClass="h-44"
                  />
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs text-[#71807B] dark:text-[#9CB0AA]">
                      <span className="font-mono">{prop.code} · {prop.address}</span>
                      <button
                        type="button"
                        onClick={() => toggleCompare(prop.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                      >
                        {isCompared ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                        <span>Compare</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E1E9E5] dark:border-[#304540] text-xs">
                      <div>
                        <p className="text-[#71807B] dark:text-[#9CB0AA]">Occupancy</p>
                        <p className="font-mono font-semibold text-sm tabular-nums text-[#059669] dark:text-[#10B981] mt-0.5">
                          {occ.occupancyRate}%
                        </p>
                        <p className="text-[11px] text-[#71807B] font-mono">
                          {occ.occupiedUnits}/{occ.totalUnits} units
                        </p>
                      </div>
                      <div>
                        <p className="text-[#71807B] dark:text-[#9CB0AA]">Rent Roll</p>
                        <p className="font-mono font-semibold text-sm tabular-nums mt-0.5">
                          {formatCurrency(fin.scheduledRent)}
                        </p>
                        <p className="text-[11px] text-[#71807B] font-mono">
                          {fin.collectionRate}% collected
                        </p>
                      </div>
                      <div>
                        <p className="text-[#71807B] dark:text-[#9CB0AA]">Maintenance</p>
                        <p className="font-mono font-semibold text-sm tabular-nums mt-0.5">
                          {openMaint} open
                        </p>
                        <p className="text-[11px] text-[#71807B]">
                          {prop.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] flex items-center justify-between gap-2 text-xs">
                  <Link
                    href={`/dashboard/properties/${prop.id}`}
                    className="font-semibold text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                  >
                    Open Property 360° →
                  </Link>
                  <Link
                    href={`/dashboard/units/explorer?propertyId=${prop.id}`}
                    className="inline-flex items-center gap-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Floor Explorer</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B] dark:text-[#9CB0AA]">
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Occupied / Total</th>
                <th className="py-3 px-4 text-right">Occupancy</th>
                <th className="py-3 px-4 text-right">Scheduled Rent</th>
                <th className="py-3 px-4 text-right">Collected</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {filtered.map(({ prop, occ, fin }) => (
                <tr key={prop.id} className="hover:bg-[#F8FAF9] dark:hover:bg-[#203530]">
                  <td className="py-3 px-4 font-semibold">
                    <Link
                      href={`/dashboard/properties/${prop.id}`}
                      className="hover:text-[#146C63] dark:hover:text-[#5BC4B4]"
                    >
                      {prop.name}
                    </Link>
                    <span className="block text-[11px] font-mono text-[#71807B]">
                      {prop.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#71807B]">{prop.type}</td>
                  <td className="py-3 px-4">
                    {prop.city}, {prop.state}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {occ.occupiedUnits} / {occ.totalUnits}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669] dark:text-[#10B981]">
                    {occ.occupancyRate}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(fin.scheduledRent)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(fin.collectedRent)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/dashboard/properties/${prop.id}`}
                      className="text-[#146C63] dark:text-[#5BC4B4] font-medium hover:underline"
                    >
                      360° View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
