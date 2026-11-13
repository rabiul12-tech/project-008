'use client';

import React, { useState } from 'react';
import { CheckCircle2, Plus, Printer } from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { StatusText } from '@/components/ui/StatusText';
import { Inspection, InspectionType } from '@/lib/types';

export default function PropertyInspectionsPage() {
  const { dataset, addInspection, updateInspection } = useEstaviaStore();
  const [selectedInsp, setSelectedInsp] = useState<Inspection | null>(
    dataset.inspections[0] || null
  );
  const [showAdd, setShowAdd] = useState(false);
  const [propId, setPropId] = useState(dataset.properties[0]?.id || 'prop-1');
  const [unitId, setUnitId] = useState(dataset.units[0]?.id || 'unit-1');
  const [inspType, setInspType] = useState<InspectionType>('Move-In');
  const [inspector, setInspector] = useState('Marcus Sterling');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Property & Unit Inspections
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Move-in, routine, move-out, and maintenance follow-up condition checklists (non-binding operational demonstration records).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Checklist</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Inspection</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Property & Unit</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {dataset.inspections.map((insp) => {
                const prop = dataset.properties.find((p) => p.id === insp.propertyId);
                const unit = dataset.units.find((u) => u.id === insp.unitId);
                return (
                  <tr
                    key={insp.id}
                    onClick={() => setSelectedInsp(insp)}
                    className="cursor-pointer hover:bg-[#F8FAF9] dark:hover:bg-[#203530]"
                  >
                    <td className="py-3 px-4 font-mono font-semibold">{insp.code}</td>
                    <td className="py-3 px-4 font-mono">{insp.date}</td>
                    <td className="py-3 px-4">
                      {prop?.name} · Unit {unit?.unitNumber}
                    </td>
                    <td className="py-3 px-4">{insp.type}</td>
                    <td className="py-3 px-4">
                      <StatusText status={insp.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {insp.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateInspection(insp.id, { status: 'Completed' });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#059669]/15 text-[#059669] font-medium"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Checklist Detail Panel */}
        {selectedInsp && (
          <div className="lg:col-span-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-5 space-y-4">
            <div className="border-b border-[#E1E9E5] dark:border-[#304540] pb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-[#71807B]">
                  {selectedInsp.code} · {selectedInsp.type} · {selectedInsp.date}
                </p>
                <h2 className="text-base font-bold mt-0.5">
                  Condition Checklist — Inspector: {selectedInsp.inspectorName}
                </h2>
              </div>
              <StatusText status={selectedInsp.status} />
            </div>

            <div className="space-y-2.5 text-xs">
              {selectedInsp.checklist.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D] border border-[#E1E9E5] dark:border-[#304540]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {item.area}: {item.item}
                    </span>
                    <span className="font-mono text-[#146C63] dark:text-[#5BC4B4]">
                      {item.condition}
                    </span>
                  </div>
                  <p className="text-[#71807B] mt-1">{item.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-6 space-y-4">
            <h2 className="text-base font-semibold">Schedule Unit Inspection</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                addInspection({
                  propertyId: propId,
                  unitId,
                  type: inspType,
                  date: '2026-11-20',
                  inspectorName: inspector,
                  status: 'Scheduled',
                  overallNotes: 'Scheduled via Inspections module.',
                  checklist: [
                    {
                      id: `chk-${Date.now()}-1`,
                      area: 'Kitchen & Living',
                      item: 'Appliances, Cabinetry & Flooring',
                      condition: 'Excellent',
                      notes: 'Baseline inspection ready.',
                    },
                  ],
                });
                setShowAdd(false);
              }}
            >
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Property</label>
                <select
                  value={propId}
                  onChange={(e) => setPropId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                >
                  {dataset.properties
                    .filter((p) => !p.archived)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Inspection Type</label>
                <select
                  value={inspType}
                  onChange={(e) => setInspType(e.target.value as InspectionType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                >
                  <option value="Move-In">Move-In</option>
                  <option value="Routine">Routine</option>
                  <option value="Move-Out">Move-Out</option>
                  <option value="Maintenance Follow-up">Maintenance Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#71807B] mb-1">Assigned Staff</label>
                <input
                  type="text"
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
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
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
