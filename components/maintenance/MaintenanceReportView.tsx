'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Clock,
  Download,
  Filter,
  MessageSquare,
  Plus,
  Printer,
  RotateCcw,
  Search,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  MAINTENANCE_STAGES,
  OPEN_MAINTENANCE_STAGES,
  aggregateOpenWorkOrdersReport,
  canTransitionMaintenanceStage,
  isMaintenanceRequestOpen,
  resolveMaintenanceTechnician,
} from '@/lib/engines/maintenance-engine';
import { downloadCsvFile, formatCurrency } from '@/lib/export/exporter';
import { StatusText } from '@/components/ui/StatusText';
import {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStage,
} from '@/lib/types';

const CATEGORIES: MaintenanceCategory[] = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Appliances',
  'Structural',
  'Locks & Security',
  'Common Area',
  'General',
];

const PRIORITIES: MaintenancePriority[] = [
  'Emergency',
  'High',
  'Medium',
  'Low',
];

const PRIORITY_RANK: Record<MaintenancePriority, number> = {
  Emergency: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

interface MaintenanceReportViewProps {
  embedded?: boolean;
}

export function MaintenanceReportView({
  embedded = false,
}: MaintenanceReportViewProps) {
  const {
    dataset,
    selectedPropertyId,
    setQuickModal,
    moveMaintenanceStage,
    updateMaintenanceRequest,
    addMaintenanceComment,
  } = useEstaviaStore();

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<
    MaintenanceCategory | 'all'
  >('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<
    MaintenancePriority | 'all'
  >('all');
  const [propertyFilter, setPropertyFilter] = useState<string>(
    selectedPropertyId || 'all'
  );
  const [stageFilter, setStageFilter] = useState<MaintenanceStage | 'all'>(
    'all'
  );
  const [onlyOpen, setOnlyOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'priority' | 'dueDate' | 'estimatedCost' | 'reportedDate'
  >('priority');

  // Selected work order for quick dispatch drawer
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');

  const activeVendors = useMemo(
    () => dataset.vendors.filter((v) => !v.archived),
    [dataset.vendors]
  );

  const activeProperties = useMemo(
    () => dataset.properties.filter((p) => !p.archived),
    [dataset.properties]
  );

  // Portfolio-wide open work orders report summary (respecting active filters)
  const reportSummary = useMemo(
    () =>
      aggregateOpenWorkOrdersReport({
        requests: dataset.maintenanceRequests,
        vendors: dataset.vendors,
        properties: dataset.properties,
        units: dataset.units,
        referenceDate: dataset.referenceDate,
        onlyOpen,
        category: categoryFilter,
        technician: technicianFilter,
        priority: priorityFilter,
        propertyId: propertyFilter,
        stage: stageFilter,
        searchQuery,
      }),
    [
      dataset.maintenanceRequests,
      dataset.vendors,
      dataset.properties,
      dataset.units,
      dataset.referenceDate,
      onlyOpen,
      categoryFilter,
      technicianFilter,
      priorityFilter,
      propertyFilter,
      stageFilter,
      searchQuery,
    ]
  );

  // Baseline portfolio open summary (unfiltered by category/tech/priority) for workload matrix reference
  const baselineOpenSummary = useMemo(
    () =>
      aggregateOpenWorkOrdersReport({
        requests: dataset.maintenanceRequests,
        vendors: dataset.vendors,
        properties: dataset.properties,
        units: dataset.units,
        referenceDate: dataset.referenceDate,
        onlyOpen: true,
        propertyId: propertyFilter,
      }),
    [
      dataset.maintenanceRequests,
      dataset.vendors,
      dataset.properties,
      dataset.units,
      dataset.referenceDate,
      propertyFilter,
    ]
  );

  const sortedRequests = useMemo(() => {
    const list = [...reportSummary.filteredRequests];
    list.sort((a, b) => {
      if (sortBy === 'priority') {
        const diff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        if (diff !== 0) return diff;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'dueDate') {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'estimatedCost') {
        return b.estimatedCost - a.estimatedCost;
      }
      return b.reportedDate.localeCompare(a.reportedDate);
    });
    return list;
  }, [reportSummary.filteredRequests, sortBy]);

  const activeRequest = useMemo(
    () =>
      dataset.maintenanceRequests.find((m) => m.id === selectedReqId) || null,
    [dataset.maintenanceRequests, selectedReqId]
  );

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    technicianFilter !== 'all' ||
    priorityFilter !== 'all' ||
    propertyFilter !== 'all' ||
    stageFilter !== 'all' ||
    !onlyOpen ||
    searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setCategoryFilter('all');
    setTechnicianFilter('all');
    setPriorityFilter('all');
    setPropertyFilter('all');
    setStageFilter('all');
    setOnlyOpen(true);
    setSearchQuery('');
  };

  const handleExportCsv = () => {
    const headers = [
      'Work Order Code',
      'Status Scope',
      'Stage',
      'Priority Level',
      'Category',
      'Technician',
      'Service Vendor',
      'Property Code',
      'Property Name',
      'Unit Number',
      'Issue Title',
      'Reported Date',
      'SLA Due Date',
      'Overdue SLA',
      'Estimated Cost',
      'Actual Cost',
    ];

    const rows = sortedRequests.map((req) => {
      const prop = dataset.properties.find((p) => p.id === req.propertyId);
      const unit = dataset.units.find((u) => u.id === req.unitId);
      const tech = resolveMaintenanceTechnician(req, dataset.vendors);
      const isOverdue =
        isMaintenanceRequestOpen(req) && req.dueDate < dataset.referenceDate;
      return [
        req.code,
        isMaintenanceRequestOpen(req) ? 'Open' : 'Completed/Closed',
        req.stage,
        req.priority,
        req.category,
        tech.technicianName,
        tech.vendorName,
        prop?.code || '',
        prop?.name || '',
        unit ? `Unit ${unit.unitNumber}` : '',
        req.title,
        req.reportedDate,
        req.dueDate,
        isOverdue ? 'OVERDUE' : 'On Track',
        req.estimatedCost,
        req.actualCost,
      ];
    });

    downloadCsvFile(
      'estavia-open-maintenance-work-orders-report.csv',
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#71807B] dark:text-[#9CB0AA] mb-1">
              <Link
                href="/dashboard/maintenance"
                className="hover:text-[#146C63] dark:hover:text-[#5BC4B4] transition-colors"
              >
                Maintenance Workspace
              </Link>
              <span>/</span>
              <span className="font-semibold text-[#1C2927] dark:text-[#F7FAF8]">
                Portfolio Open Work Orders Report
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Portfolio Maintenance & Open Work Orders Report
            </h1>
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
              Aggregated view of all open work orders across the portfolio with multi-dimensional filtering by category, assigned technician, and priority level.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/maintenance"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium hover:border-[#146C63] transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </Link>
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#146C63] text-[#146C63] dark:text-[#5BC4B4] dark:border-[#5BC4B4] text-xs font-medium hover:bg-[#E9F5F1] dark:hover:bg-[#203530] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickModal('create-maintenance')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Work Order</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Aggregation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <div className="flex items-center justify-between text-xs text-[#71807B] dark:text-[#9CB0AA]">
            <span>Matching Open Work Orders</span>
            <Wrench className="w-4 h-4 text-[#146C63] dark:text-[#5BC4B4]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums mt-2">
            {reportSummary.totalOpenCount}
          </p>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1 font-mono tabular-nums">
            {reportSummary.assignedCount} Assigned · {reportSummary.unassignedCount} Unassigned
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <div className="flex items-center justify-between text-xs text-[#71807B] dark:text-[#9CB0AA]">
            <span>Emergency & High Priority</span>
            <AlertTriangle className="w-4 h-4 text-[#DC2626] dark:text-[#EF4444]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#DC2626] dark:text-[#EF4444] mt-2">
            {reportSummary.emergencyAndHighCount}
          </p>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1 font-mono tabular-nums">
            {reportSummary.emergencyCount} Emergency · {reportSummary.highPriorityCount} High
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <div className="flex items-center justify-between text-xs text-[#71807B] dark:text-[#9CB0AA]">
            <span>SLA Past Due Work Orders</span>
            <Clock className="w-4 h-4 text-[#D97706] dark:text-[#F59E0B]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#D97706] dark:text-[#F59E0B] mt-2">
            {reportSummary.overdueCount}
          </p>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1 font-mono tabular-nums">
            Ref Date: {dataset.referenceDate}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <div className="flex items-center justify-between text-xs text-[#71807B] dark:text-[#9CB0AA]">
            <span>Estimated Open Exposure</span>
            <UserCheck className="w-4 h-4 text-[#146C63] dark:text-[#5BC4B4]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#146C63] dark:text-[#5BC4B4] mt-2">
            {formatCurrency(reportSummary.totalEstimatedCost)}
          </p>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1 font-mono tabular-nums">
            Technician Dispatch: {reportSummary.assignmentRate}%
          </p>
        </div>
      </div>

      {/* Multi-Dimensional Filter Control Panel */}
      <div
        aria-label="Maintenance Report Filters"
        className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E9E5] dark:border-[#304540] pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#146C63] dark:text-[#5BC4B4]" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-[#71807B] dark:text-[#9CB0AA]">
              Filter Open Work Orders by Category, Technician & Priority Level
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="rounded border-[#E1E9E5] text-[#146C63] focus:ring-[#146C63]"
              />
              <span className="font-medium">
                Open Work Orders Only (New, Reviewed, Assigned, In Progress)
              </span>
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium text-[#146C63] dark:text-[#5BC4B4] hover:bg-[#E9F5F1] dark:hover:bg-[#203530]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Filter Grid: Category, Technician, Priority Level, Property, Stage, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* 1. Category Filter */}
          <div>
            <label
              htmlFor="maint-report-category-filter"
              className="block text-[11px] font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1"
            >
              Category
            </label>
            <select
              id="maint-report-category-filter"
              aria-label="Filter by Category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value as MaintenanceCategory | 'all'
                )
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-medium"
            >
              <option value="all">All Categories ({CATEGORIES.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Technician Filter */}
          <div>
            <label
              htmlFor="maint-report-technician-filter"
              className="block text-[11px] font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1"
            >
              Technician / Vendor
            </label>
            <select
              id="maint-report-technician-filter"
              aria-label="Filter by Technician"
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-medium"
            >
              <option value="all">All Technicians</option>
              <option value="Unassigned">Unassigned Only</option>
              {activeVendors.map((v) => (
                <option key={v.id} value={v.contactName}>
                  {v.contactName} ({v.businessName})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Priority Level Filter */}
          <div>
            <label
              htmlFor="maint-report-priority-filter"
              className="block text-[11px] font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1"
            >
              Priority Level
            </label>
            <select
              id="maint-report-priority-filter"
              aria-label="Filter by Priority Level"
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value as MaintenancePriority | 'all'
                )
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-medium"
            >
              <option value="all">All Priority Levels</option>
              {PRIORITIES.map((prio) => (
                <option key={prio} value={prio}>
                  {prio}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Property Filter */}
          <div>
            <label
              htmlFor="maint-report-property-filter"
              className="block text-[11px] font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1"
            >
              Property Scope
            </label>
            <select
              id="maint-report-property-filter"
              aria-label="Filter by Property"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-medium"
            >
              <option value="all">
                Entire Portfolio ({activeProperties.length})
              </option>
              {activeProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Workflow Stage Filter */}
          <div>
            <label
              htmlFor="maint-report-stage-filter"
              className="block text-[11px] font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1"
            >
              Workflow Stage
            </label>
            <select
              id="maint-report-stage-filter"
              aria-label="Filter by Workflow Stage"
              value={stageFilter}
              onChange={(e) =>
                setStageFilter(e.target.value as MaintenanceStage | 'all')
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-medium"
            >
              <option value="all">
                {onlyOpen ? 'All Open Stages (4)' : 'All Stages (7)'}
              </option>
              {(onlyOpen ? OPEN_MAINTENANCE_STAGES : MAINTENANCE_STAGES).map(
                (st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                )
              )}
            </select>
          </div>

          {/* 6. Search Input */}
          <div>
            <label
              htmlFor="maint-report-search"
              className="block text-[11px] font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1"
            >
              Search Work Orders
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71807B]" />
              <input
                id="maint-report-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="WO code, title, tech, unit..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
              />
            </div>
          </div>
        </div>

        {/* Quick Priority Level Selector Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E1E9E5] dark:border-[#304540]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#71807B] dark:text-[#9CB0AA]">
              Quick Priority Filter:
            </span>
            <button
              type="button"
              onClick={() => setPriorityFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                priorityFilter === 'all'
                  ? 'bg-[#146C63] text-white border-[#146C63]'
                  : 'border-[#E1E9E5] dark:border-[#304540] text-[#71807B] hover:text-[#1C2927] dark:hover:text-white'
              }`}
            >
              All ({baselineOpenSummary.totalOpenCount})
            </button>
            {reportSummary.byPriority.map((item) => (
              <button
                key={item.priority}
                type="button"
                onClick={() =>
                  setPriorityFilter(
                    priorityFilter === item.priority ? 'all' : item.priority
                  )
                }
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  priorityFilter === item.priority
                    ? 'bg-[#E9F5F1] dark:bg-[#203530] border-[#146C63] text-[#146C63] dark:text-[#5BC4B4]'
                    : 'border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]'
                }`}
              >
                <StatusText status={item.priority} />
                <span className="font-mono text-[11px] text-[#71807B] dark:text-[#9CB0AA]">
                  ({item.count})
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#71807B]" />
            <span className="text-[#71807B] dark:text-[#9CB0AA]">Sort by:</span>
            <select
              aria-label="Sort work orders"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | 'priority'
                    | 'dueDate'
                    | 'estimatedCost'
                    | 'reportedDate'
                )
              }
              className="px-2.5 py-1 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] text-xs font-medium"
            >
              <option value="priority">Priority Severity (Highest First)</option>
              <option value="dueDate">SLA Due Date (Earliest First)</option>
              <option value="estimatedCost">Estimated Cost (Highest First)</option>
              <option value="reportedDate">Reported Date (Newest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Portfolio Breakdown Row: Category Distribution + Technician Workload Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Distribution Chart & Interactive Filter List */}
        <div className="lg:col-span-5 p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Open Work Orders by Category
              </h2>
              <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                Click any category row below to filter the portfolio report
              </p>
            </div>
            {categoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="text-xs text-[#146C63] dark:text-[#5BC4B4] hover:underline"
              >
                Show All Categories
              </button>
            )}
          </div>

          {reportSummary.byCategory.length > 0 ? (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportSummary.byCategory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E1E9E5"
                    opacity={0.4}
                  />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => `${Number(v ?? 0)} work orders`}
                  />
                  <Bar
                    dataKey="count"
                    name="Open Work Orders"
                    fill="#146C63"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-[#71807B]">
              No work orders match the active filter combination.
            </div>
          )}

          <div className="space-y-1.5 border-t border-[#E1E9E5] dark:border-[#304540] pt-3">
            {reportSummary.byCategory.map((cat) => {
              const isSelected = categoryFilter === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() =>
                    setCategoryFilter(isSelected ? 'all' : cat.category)
                  }
                  className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#E9F5F1] dark:bg-[#203530] text-[#146C63] dark:text-[#5BC4B4] font-semibold'
                      : 'hover:bg-[#F8FAF9] dark:hover:bg-[#121F1D]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{cat.category}</span>
                    {cat.emergencyOrHighCount > 0 && (
                      <span className="text-[11px] font-mono text-[#DC2626] dark:text-[#EF4444]">
                        ({cat.emergencyOrHighCount} urgent)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span>{cat.count} open</span>
                    <span className="text-[#71807B] dark:text-[#9CB0AA] w-20 text-right">
                      {formatCurrency(cat.estimatedCost)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Technician Workload & Dispatch Matrix */}
        <div className="lg:col-span-7 p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Technician Workload & Dispatch Matrix
              </h2>
              <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                Click any technician row to isolate their assigned open work orders
              </p>
            </div>
            {technicianFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setTechnicianFilter('all')}
                className="text-xs text-[#146C63] dark:text-[#5BC4B4] hover:underline"
              >
                Clear Technician Filter ({technicianFilter})
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Service Vendor</th>
                  <th className="py-2.5 px-3 text-right">Open Orders</th>
                  <th className="py-2.5 px-3 text-right">Emergency / High</th>
                  <th className="py-2.5 px-3 text-right">SLA Overdue</th>
                  <th className="py-2.5 px-3 text-right">Est. Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
                {baselineOpenSummary.byTechnician.map((tech) => {
                  const isSelected =
                    technicianFilter.toLowerCase() ===
                    tech.technicianName.toLowerCase();
                  return (
                    <tr
                      key={tech.technicianName}
                      onClick={() =>
                        setTechnicianFilter(
                          isSelected ? 'all' : tech.technicianName
                        )
                      }
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#E9F5F1] dark:bg-[#203530] font-semibold'
                          : 'hover:bg-[#F8FAF9] dark:hover:bg-[#121F1D]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-medium">
                        <span
                          className={
                            tech.technicianName === 'Unassigned'
                              ? 'text-[#D97706] dark:text-[#F59E0B] font-semibold'
                              : 'text-[#1C2927] dark:text-[#F7FAF8]'
                          }
                        >
                          {tech.technicianName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#71807B] dark:text-[#9CB0AA] truncate max-w-[180px]">
                        {tech.vendorName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                        {tech.openCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {tech.emergencyCount + tech.highCount > 0 ? (
                          <span className="text-[#DC2626] dark:text-[#EF4444]">
                            {tech.emergencyCount + tech.highCount}
                          </span>
                        ) : (
                          <span className="text-[#71807B]">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {tech.overdueCount > 0 ? (
                          <span className="text-[#D97706] dark:text-[#F59E0B]">
                            {tech.overdueCount}
                          </span>
                        ) : (
                          <span className="text-[#059669]">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(tech.estimatedCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main Aggregated Open Work Orders Table + Optional Quick-Dispatch Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className={`${
            activeRequest ? 'lg:col-span-8' : 'lg:col-span-12'
          } rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">
                Aggregated Portfolio Work Orders ({sortedRequests.length})
              </h2>
              <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                Reassign technicians or advance workflow stages directly inline, or click any row for full dispatch notes.
              </p>
            </div>
            {embedded && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#146C63] text-white text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Maintenance CSV</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B] bg-[#F8FAF9]/60 dark:bg-[#121F1D]/60">
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Property & Unit</th>
                  <th className="py-3 px-4">Category & Issue</th>
                  <th className="py-3 px-4">Priority Level</th>
                  <th className="py-3 px-4">Technician / Vendor</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">SLA Due</th>
                  <th className="py-3 px-4 text-right">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
                {sortedRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 px-4 text-center text-[#71807B] dark:text-[#9CB0AA]"
                    >
                      No work orders match your selected Category, Technician, and Priority filters.
                    </td>
                  </tr>
                ) : (
                  sortedRequests.map((req) => {
                    const prop = dataset.properties.find(
                      (p) => p.id === req.propertyId
                    );
                    const unit = dataset.units.find((u) => u.id === req.unitId);
                    const tech = resolveMaintenanceTechnician(
                      req,
                      dataset.vendors
                    );
                    const isOverdue =
                      isMaintenanceRequestOpen(req) &&
                      req.dueDate < dataset.referenceDate;

                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedReqId(req.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedReqId === req.id
                            ? 'bg-[#E9F5F1]/60 dark:bg-[#203530]'
                            : 'hover:bg-[#F8FAF9] dark:hover:bg-[#121F1D]'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono">
                          <span className="font-semibold text-[#1C2927] dark:text-[#F7FAF8] block">
                            {req.code}
                          </span>
                          <span className="text-[11px] text-[#71807B]">
                            Logged {req.reportedDate}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-[#1C2927] dark:text-[#F7FAF8]">
                            <Building2 className="w-3.5 h-3.5 text-[#146C63] dark:text-[#5BC4B4] shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {prop?.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#71807B] block mt-0.5">
                            Unit {unit?.unitNumber} ({unit?.type})
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-[240px]">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#146C63] dark:text-[#5BC4B4] block">
                            {req.category}
                          </span>
                          <span className="font-medium text-[#1C2927] dark:text-[#F7FAF8] line-clamp-1">
                            {req.title}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusText status={req.priority} />
                        </td>

                        <td
                          className="py-3 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            aria-label={`Assign technician for ${req.code}`}
                            value={req.vendorId || ''}
                            onChange={(e) => {
                              const nextVendorId = e.target.value || undefined;
                              updateMaintenanceRequest(req.id, {
                                vendorId: nextVendorId,
                                stage:
                                  nextVendorId &&
                                  (req.stage === 'New' ||
                                    req.stage === 'Reviewed')
                                    ? 'Assigned'
                                    : req.stage,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] text-xs font-medium max-w-[190px]"
                          >
                            <option value="">Unassigned</option>
                            {activeVendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.contactName} — {v.businessName}
                              </option>
                            ))}
                          </select>
                          <span className="block text-[10px] text-[#71807B] mt-0.5 truncate max-w-[190px]">
                            {tech.vendorName}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusText status={req.stage} />
                        </td>

                        <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                          <span
                            className={
                              isOverdue
                                ? 'text-[#DC2626] dark:text-[#EF4444] font-semibold'
                                : 'text-[#1C2927] dark:text-[#F7FAF8]'
                            }
                          >
                            {req.dueDate}
                          </span>
                          {isOverdue && (
                            <span className="block text-[10px] text-[#DC2626] dark:text-[#EF4444] font-semibold">
                              Past SLA
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {formatCurrency(req.estimatedCost)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Work Order Dispatch & Detail Drawer */}
        {activeRequest && (
          <aside
            aria-label="Work Order Dispatch Drawer"
            className="lg:col-span-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] p-5 space-y-4 sticky top-20"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#E1E9E5] dark:border-[#304540] pb-3">
              <div>
                <span className="text-xs font-mono text-[#71807B]">
                  {activeRequest.code} · {activeRequest.category}
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  {activeRequest.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqId(null)}
                className="p-1 text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
                aria-label="Close detail drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <StatusText status={activeRequest.priority} />
              <StatusText status={activeRequest.stage} />
            </div>

            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] leading-relaxed">
              {activeRequest.description}
            </p>

            {/* Assign Technician / Vendor */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold">
                Assigned Technician & Service Vendor
              </label>
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
                {activeVendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.contactName} — {v.businessName} ({v.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Transition Controls */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold">
                Advance Workflow Stage
              </label>
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
                      onClick={() =>
                        moveMaintenanceStage(
                          activeRequest.id,
                          st as MaintenanceStage
                        )
                      }
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

            {/* Comments */}
            <div className="space-y-2.5 text-xs border-t border-[#E1E9E5] dark:border-[#304540] pt-4">
              <h4 className="font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Dispatch Log ({activeRequest.comments.length})</span>
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {activeRequest.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <p className="font-medium">
                      {c.authorName} ·{' '}
                      <span className="font-mono text-[#71807B]">
                        {c.createdAt}
                      </span>
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
                  placeholder="Add technician dispatch instruction..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#146C63] text-white font-medium"
                >
                  Post
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
