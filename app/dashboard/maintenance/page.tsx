'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileBarChart,
  Kanban,
  List,
  MessageSquare,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  MAINTENANCE_STAGES,
  canTransitionMaintenanceStage,
} from '@/lib/engines/maintenance-engine';
import { formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import { MaintenanceReportView } from '@/components/maintenance/MaintenanceReportView';
import { MaintenanceStage } from '@/lib/types';

export default function MaintenanceKanbanWorkspacePage() {
  const {
    dataset,
    selectedPropertyId,
    setQuickModal,
    moveMaintenanceStage,
    updateMaintenanceRequest,
    addMaintenanceComment,
    recordMaintenanceCost,
  } = useEstaviaStore();

  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'report'>('kanban');
  const [search, setSearch] = useState('');
  const [prioFilter, setPrioFilter] = useState<string>('all');
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [costInput, setCostInput] = useState<number>(0);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.maintenanceRequests.filter((m) => {
      if (selectedPropertyId !== 'all' && m.propertyId !== selectedPropertyId)
        return false;
      if (prioFilter !== 'all' && m.priority !== prioFilter) return false;
      if (
        q &&
        !m.title.toLowerCase().includes(q) &&
        !m.code.toLowerCase().includes(q) &&
        !m.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [dataset.maintenanceRequests, selectedPropertyId, prioFilter, search]);

  const activeRequest = useMemo(
    () =>
      dataset.maintenanceRequests.find((m) => m.id === selectedReqId) || null,
    [dataset.maintenanceRequests, selectedReqId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Maintenance Work Order Kanban & Operations
          </h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Drag cards across the 7 workflow stages, inspect technician dispatch, or switch to the Portfolio Open Work Orders Report.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <Link
            href="/dashboard/maintenance/report"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#146C63] text-[#146C63] dark:text-[#5BC4B4] dark:border-[#5BC4B4] hover:bg-[#E9F5F1] dark:hover:bg-[#203530] text-xs font-medium transition-colors"
          >
            <FileBarChart className="w-3.5 h-3.5" />
            <span>Open Work Orders Report</span>
          </Link>
          <button
            type="button"
            onClick={() => setQuickModal('create-maintenance')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Work Order</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
        {viewMode !== 'report' ? (
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search work order code, title, category..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
              />
            </div>

            <select
              value={prioFilter}
              onChange={(e) => setPrioFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
            >
              <option value="all">All Priorities</option>
              <option value="Emergency">Emergency</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        ) : (
          <div className="text-xs font-medium text-[#71807B] dark:text-[#9CB0AA]">
            Portfolio Open Work Orders Aggregation — Filter by Category, Technician & Priority Level
          </div>
        )}

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D] border border-[#E1E9E5] dark:border-[#304540]">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-[#203530] text-[#1C2927] dark:text-white shadow-sm'
                : 'text-[#71807B]'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              viewMode === 'list'
                ? 'bg-white dark:bg-[#203530] text-[#1C2927] dark:text-white shadow-sm'
                : 'text-[#71807B]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('report')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              viewMode === 'report'
                ? 'bg-white dark:bg-[#203530] text-[#1C2927] dark:text-white shadow-sm'
                : 'text-[#71807B]'
            }`}
          >
            <FileBarChart className="w-3.5 h-3.5" />
            <span>Maintenance Report View</span>
          </button>
        </div>
      </div>

      {viewMode === 'report' ? (
        <MaintenanceReportView embedded />
      ) : (
      /* Main Content + Detail Drawer */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={activeRequest ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {viewMode === 'kanban' ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {MAINTENANCE_STAGES.map((stage) => {
                const items = filteredRequests.filter((m) => m.stage === stage);
                return (
                  <div
                    key={stage}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedId) {
                        moveMaintenanceStage(draggedId, stage);
                        setDraggedId(null);
                      }
                    }}
                    className="w-72 shrink-0 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] flex flex-col max-h-[72vh]"
                  >
                    <div className="px-4 py-3 border-b border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between">
                      <span className="text-xs font-semibold">{stage}</span>
                      <span className="text-xs font-mono text-[#71807B]">
                        {items.length}
                      </span>
                    </div>

                    <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                      {items.map((req) => {
                        const prop = dataset.properties.find(
                          (p) => p.id === req.propertyId
                        );
                        const unit = dataset.units.find((u) => u.id === req.unitId);
                        const vendor = dataset.vendors.find(
                          (v) => v.id === req.vendorId
                        );
                        return (
                          <div
                            key={req.id}
                            draggable
                            onDragStart={() => setDraggedId(req.id)}
                            onClick={() => {
                              setSelectedReqId(req.id);
                              setCostInput(req.actualCost || req.estimatedCost);
                            }}
                            className={`p-3.5 rounded-lg border cursor-pointer transition-colors space-y-2 text-xs ${
                              selectedReqId === req.id
                                ? 'border-[#146C63] bg-[#E9F5F1]/50 dark:bg-[#203530]'
                                : 'border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] hover:border-[#146C63]/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold text-[#71807B]">
                                {req.code}
                              </span>
                              <StatusText status={req.priority} />
                            </div>
                            <p className="font-semibold text-[#1C2927] dark:text-[#F7FAF8] leading-snug">
                              {req.title}
                            </p>
                            <p className="text-[11px] text-[#71807B] truncate">
                              {prop?.name} · Unit {unit?.unitNumber}
                            </p>
                            <div className="pt-2 border-t border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between text-[11px] font-mono text-[#71807B]">
                              <span className="truncate max-w-[130px]">
                                {vendor ? vendor.businessName : 'Unassigned'}
                              </span>
                              <span>
                                Est {formatCurrency(req.estimatedCost)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Issue</th>
                    <th className="py-3 px-4">Property & Unit</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">Est / Actual Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
                  {filteredRequests.map((req) => {
                    const prop = dataset.properties.find((p) => p.id === req.propertyId);
                    const unit = dataset.units.find((u) => u.id === req.unitId);
                    return (
                      <tr
                        key={req.id}
                        onClick={() => {
                          setSelectedReqId(req.id);
                          setCostInput(req.actualCost || req.estimatedCost);
                        }}
                        className="cursor-pointer hover:bg-[#F8FAF9] dark:hover:bg-[#203530]"
                      >
                        <td className="py-3 px-4 font-mono font-semibold">{req.code}</td>
                        <td className="py-3 px-4 font-medium">{req.title}</td>
                        <td className="py-3 px-4">
                          {prop?.name} · Unit {unit?.unitNumber}
                        </td>
                        <td className="py-3 px-4">
                          <StatusText status={req.priority} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusText status={req.stage} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {formatCurrency(req.estimatedCost)} /{' '}
                          {formatCurrency(req.actualCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Maintenance Detail Drawer */}
        {activeRequest && (
          <aside
            aria-label="Maintenance Work Order Detail Drawer"
            className="lg:col-span-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-5 space-y-5 sticky top-20"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#E1E9E5] dark:border-[#304540] pb-3">
              <div>
                <span className="text-xs font-mono text-[#71807B]">
                  {activeRequest.code} · {activeRequest.category}
                </span>
                <h2 className="text-base font-bold mt-0.5">{activeRequest.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqId(null)}
                className="p-1 text-[#71807B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] leading-relaxed">
              {activeRequest.description}
            </p>

            {/* Stage Transition Controls */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold">Move Workflow Stage</label>
              <div className="flex flex-wrap gap-1.5">
                {MAINTENANCE_STAGES.map((st) => {
                  const allowed = canTransitionMaintenanceStage(
                    activeRequest.stage,
                    st
                  );
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={!allowed}
                      onClick={() => moveMaintenanceStage(activeRequest.id, st as MaintenanceStage)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border ${
                        activeRequest.stage === st
                          ? 'bg-[#146C63] text-white border-[#146C63]'
                          : allowed
                          ? 'border-[#E1E9E5] dark:border-[#304540] hover:bg-[#E9F5F1] dark:hover:bg-[#203530]'
                          : 'opacity-40 cursor-not-allowed border-[#E1E9E5]'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assign Vendor */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold">Assigned Service Vendor</label>
              <select
                value={activeRequest.vendorId || ''}
                onChange={(e) =>
                  updateMaintenanceRequest(activeRequest.id, {
                    vendorId: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
              >
                <option value="">Unassigned</option>
                {dataset.vendors
                  .filter((v) => !v.archived)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName} ({v.category})
                    </option>
                  ))}
              </select>
            </div>

            {/* Record Actual Cost -> Syncs Single Expense Record */}
            <div className="space-y-2 text-xs border-t border-[#E1E9E5] dark:border-[#304540] pt-4">
              <label className="block font-semibold">
                Record Actual Repair Cost (Est: {formatCurrency(activeRequest.estimatedCost)})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={costInput}
                  onChange={(e) => setCostInput(Number(e.target.value))}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => recordMaintenanceCost(activeRequest.id, Number(costInput))}
                  className="px-3 py-1.5 rounded-lg bg-[#146C63] text-white font-medium"
                >
                  Sync Expense
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2.5 text-xs border-t border-[#E1E9E5] dark:border-[#304540] pt-4">
              <h3 className="font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Work Order Notes ({activeRequest.comments.length})</span>
              </h3>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {activeRequest.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <p className="font-medium">
                      {c.authorName} · <span className="font-mono text-[#71807B]">{c.createdAt}</span>
                    </p>
                    <p className="text-[#71807B] mt-0.5">{c.content}</p>
                  </div>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!commentText.trim()) return;
                  addMaintenanceComment(activeRequest.id, commentText);
                  setCommentText('');
                }}
              >
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add technician or coordinator note..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] font-medium"
                >
                  Post
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>
      )}
    </div>
  );
}
