'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock,
  FileSignature,
  KeyRound,
  Layers,
  Wrench,
  X,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { deriveUnitOccupancyStatus } from '@/lib/engines/occupancy-engine';
import { formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';

export default function InteractiveBuildingUnitExplorerPage() {
  const { dataset, setQuickModal } = useEstaviaStore();

  const activeProperties = useMemo(
    () => dataset.properties.filter((p) => !p.archived),
    [dataset.properties]
  );

  const [selectedPropId, setSelectedPropId] = useState<string>(
    activeProperties[0]?.id || 'prop-1'
  );
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const property = useMemo(
    () =>
      activeProperties.find((p) => p.id === selectedPropId) || activeProperties[0],
    [activeProperties, selectedPropId]
  );

  const propertyBuildings = useMemo(
    () => dataset.buildings.filter((b) => b.propertyId === property?.id),
    [dataset.buildings, property?.id]
  );

  const propertyUnits = useMemo(
    () =>
      dataset.units
        .filter((u) => !u.archived && u.propertyId === property?.id)
        .map((u) => {
          const derived = deriveUnitOccupancyStatus(
            u,
            dataset.leases,
            dataset.referenceDate
          );
          const tenant = derived.activeLease
            ? dataset.tenants.find((t) => t.id === derived.activeLease?.tenantId)
            : derived.scheduledLease
            ? dataset.tenants.find((t) => t.id === derived.scheduledLease?.tenantId)
            : undefined;
          const openMaint = dataset.maintenanceRequests.filter(
            (m) =>
              m.unitId === u.id &&
              m.stage !== 'Resolved' &&
              m.stage !== 'Closed' &&
              m.stage !== 'Cancelled'
          );
          return { unit: u, derived, tenant, openMaint };
        }),
    [dataset, property?.id]
  );

  const floorsList = useMemo(() => {
    const nums = Array.from(
      new Set(propertyUnits.map((item) => item.unit.floorNumber))
    ).sort((a, b) => b - a); // Top floor down like a real building elevation!
    return nums;
  }, [propertyUnits]);

  const activeUnitDetail = useMemo(
    () => propertyUnits.find((item) => item.unit.id === selectedUnitId) || null,
    [propertyUnits, selectedUnitId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Interactive Building & Unit Explorer
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Visual architectural stacking plan: Property → Building → Floor → Unit. Click any unit card to inspect occupancy, lease, and maintenance history.
          </p>
        </div>

        {/* Accessible Legend (Pairs Icon + Explicit Label + Surface Pattern) */}
        <div
          aria-label="Unit Status Legend"
          className="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs"
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-[#059669] dark:text-[#10B981]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Occupied</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#146C63] dark:text-[#5BC4B4]">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Vacant (Available)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#C99B58]">
            <Clock className="w-3.5 h-3.5" />
            <span>Reserved (Scheduled)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#D97706]">
            <Wrench className="w-3.5 h-3.5" />
            <span>Under Maintenance</span>
          </span>
        </div>
      </div>

      {/* Property & Floor Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="w-4 h-4 text-[#146C63] dark:text-[#5BC4B4]" />
            <label htmlFor="explorer-prop-select" className="font-medium">
              Property:
            </label>
            <select
              id="explorer-prop-select"
              value={selectedPropId}
              onChange={(e) => {
                setSelectedPropId(e.target.value);
                setSelectedFloor('all');
                setSelectedUnitId(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-medium"
            >
              {activeProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Layers className="w-4 h-4 text-[#71807B]" />
            <span className="text-[#71807B]">Floor Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedFloor('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedFloor === 'all'
                  ? 'bg-[#146C63] text-white'
                  : 'bg-[#F8FAF9] dark:bg-[#121F1D] text-[#71807B]'
              }`}
            >
              All Floors ({floorsList.length})
            </button>
            {floorsList.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFloor(f)}
                className={`px-2.5 py-1 rounded-md font-mono font-medium transition-colors ${
                  selectedFloor === f
                    ? 'bg-[#146C63] text-white'
                    : 'bg-[#F8FAF9] dark:bg-[#121F1D] text-[#71807B]'
                }`}
              >
                F{f}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs font-mono text-[#71807B]">
          {propertyBuildings.length} Building(s) · {propertyUnits.length} Units
        </span>
      </div>

      {/* Stacking Plan Grid + Detail Drawer Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={activeUnitDetail ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {floorsList
            .filter((f) => selectedFloor === 'all' || f === selectedFloor)
            .map((floorNum) => {
              const unitsOnFloor = propertyUnits.filter(
                (item) => item.unit.floorNumber === floorNum
              );
              return (
                <div
                  key={floorNum}
                  className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#E1E9E5] dark:border-[#304540] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E9F5F1] dark:bg-[#203530] text-[#146C63] dark:text-[#5BC4B4]">
                        FLOOR {floorNum}
                      </span>
                      <span className="text-xs text-[#71807B]">
                        {floorNum === 1
                          ? 'Ground / Atrium Level'
                          : floorNum === floorsList[0]
                          ? 'Upper / Penthouse Level'
                          : `Standard Level ${floorNum}`}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#71807B]">
                      {unitsOnFloor.length} Units
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {unitsOnFloor.map(({ unit, derived, tenant, openMaint }) => {
                      const isSelected = selectedUnitId === unit.id;
                      const initials = tenant
                        ? `${tenant.firstName[0] || ''}${tenant.lastName[0] || ''}`
                        : '—';

                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => setSelectedUnitId(unit.id)}
                          className={`text-left p-3.5 rounded-lg border transition-colors flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'border-[#146C63] dark:border-[#5BC4B4] bg-[#E9F5F1]/50 dark:bg-[#203530]'
                              : 'border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9]/60 dark:bg-[#121F1D] hover:border-[#146C63]/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div>
                              <p className="font-mono text-sm font-bold">
                                Unit {unit.unitNumber}
                              </p>
                              <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA]">
                                {unit.type} · {unit.sqFt} sf
                              </p>
                            </div>
                            <div
                              className="w-7 h-7 rounded-full bg-white dark:bg-[#192A27] border border-[#E1E9E5] dark:border-[#304540] flex items-center justify-center text-[11px] font-mono font-semibold shrink-0"
                              title={tenant ? tenant.fullName : 'Vacant'}
                            >
                              {initials}
                            </div>
                          </div>

                          <div className="w-full pt-2 border-t border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between text-xs">
                            <StatusText status={derived.status} />
                            <span className="font-mono font-semibold tabular-nums">
                              {formatCurrency(
                                derived.activeLease?.monthlyRent ?? unit.askingRent
                              )}
                            </span>
                          </div>

                          <div className="w-full flex items-center justify-between text-[11px] text-[#71807B] dark:text-[#9CB0AA]">
                            <span className="truncate">
                              {tenant ? tenant.fullName : 'Ready for Leasing'}
                            </span>
                            {openMaint.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[#D97706] font-mono shrink-0">
                                <Wrench className="w-3 h-3" />
                                {openMaint.length}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Unit Detail Drawer */}
        {activeUnitDetail && (
          <aside
            aria-label="Unit Detail Drawer"
            className="lg:col-span-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-5 space-y-5 sticky top-20"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#E1E9E5] dark:border-[#304540] pb-4">
              <div>
                <p className="text-xs font-mono text-[#71807B]">
                  {property.name} · Floor {activeUnitDetail.unit.floorNumber}
                </p>
                <h2 className="text-lg font-bold font-mono mt-0.5">
                  Unit {activeUnitDetail.unit.unitNumber}
                </h2>
                <StatusText status={activeUnitDetail.derived.status} className="mt-1" />
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnitId(null)}
                className="p-1.5 rounded-lg text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                aria-label="Close unit detail drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D]">
                <p className="text-[#71807B]">Category & Layout</p>
                <p className="font-semibold mt-0.5">{activeUnitDetail.unit.type}</p>
                <p className="font-mono text-[11px] text-[#71807B]">
                  {activeUnitDetail.unit.bedrooms}BR · {activeUnitDetail.unit.bathrooms}BA ·{' '}
                  {activeUnitDetail.unit.sqFt} sq ft
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D]">
                <p className="text-[#71807B]">Asking / Lease Rent</p>
                <p className="font-mono font-bold text-sm tabular-nums mt-0.5">
                  {formatCurrency(
                    activeUnitDetail.derived.activeLease?.monthlyRent ??
                      activeUnitDetail.unit.askingRent
                  )}
                  /mo
                </p>
              </div>
            </div>

            {/* Occupancy & Tenant Info */}
            <div className="space-y-2 text-xs border-t border-[#E1E9E5] dark:border-[#304540] pt-4">
              <h3 className="font-semibold">Current Occupancy & Lease</h3>
              {activeUnitDetail.derived.activeLease && activeUnitDetail.tenant ? (
                <div className="p-3 rounded-lg bg-[#E9F5F1]/60 dark:bg-[#203530] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#71807B]">Resident:</span>
                    <Link
                      href={`/dashboard/tenants/${activeUnitDetail.tenant.id}`}
                      className="font-semibold text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                    >
                      {activeUnitDetail.tenant.fullName}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71807B]">Lease Code:</span>
                    <Link
                      href={`/dashboard/leases/${activeUnitDetail.derived.activeLease.id}`}
                      className="font-mono font-semibold hover:underline"
                    >
                      {activeUnitDetail.derived.activeLease.code}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71807B]">Term [Start, End):</span>
                    <span className="font-mono">
                      [{activeUnitDetail.derived.activeLease.startDate},{' '}
                      {activeUnitDetail.derived.activeLease.endDate})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D] space-y-2">
                  <p className="text-[#71807B]">
                    No active occupant on reference date {dataset.referenceDate}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuickModal('create-lease')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#146C63] text-white font-medium text-xs"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Assign Tenant & Create Lease</span>
                  </button>
                </div>
              )}
            </div>

            {/* Maintenance Requests for Unit */}
            <div className="space-y-2 text-xs border-t border-[#E1E9E5] dark:border-[#304540] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Unit Work Orders ({activeUnitDetail.openMaint.length} Open)
                </h3>
                <button
                  type="button"
                  onClick={() => setQuickModal('create-maintenance')}
                  className="text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                >
                  + Log Issue
                </button>
              </div>
              {activeUnitDetail.openMaint.length === 0 ? (
                <p className="text-[#71807B]">No open maintenance requests for this unit.</p>
              ) : (
                <div className="space-y-2">
                  {activeUnitDetail.openMaint.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                    >
                      <p className="font-medium">{m.title}</p>
                      <p className="text-[11px] font-mono text-[#71807B] mt-0.5">
                        {m.code} · {m.stage} · {m.priority}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
