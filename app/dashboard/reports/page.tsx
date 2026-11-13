'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Download, Printer, Trash2, Wrench } from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { calculateOccupancySummary } from '@/lib/engines/occupancy-engine';
import { calculateFinancialSummary } from '@/lib/engines/financial-engine';
import { downloadCsvFile, formatCurrency } from '@/lib/export/exporter';
import { MaintenanceReportView } from '@/components/maintenance/MaintenanceReportView';

const REPORT_TYPES = [
  'Operating Performance Report',
  'Property Portfolio Report',
  'Unit Occupancy Report',
  'Vacancy Report',
  'Lease Expiration Report',
  'Rent Roll Report',
  'Rent Collection Report',
  'Outstanding Rent Report',
  'Security Deposit Report',
  'Maintenance Report',
  'Property Expense Report',
] as const;

export default function ReportingCenterPage() {
  const {
    dataset,
    selectedPropertyId,
    selectedPeriod,
    saveReportConfig,
    deleteSavedReport,
  } = useEstaviaStore();

  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);
  const [propFilter, setPropFilter] = useState<string>(selectedPropertyId);
  const [presetName, setPresetName] = useState('');

  const reportData = useMemo(() => {
    const props = dataset.properties.filter(
      (p) => !p.archived && (propFilter === 'all' || p.id === propFilter)
    );
    return props.map((prop) => {
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
      return { prop, occ, fin };
    });
  }, [dataset, propFilter, selectedPeriod]);

  const handleExportCsv = () => {
    const headers = [
      'Report Type',
      'Property Code',
      'Property Name',
      'Total Units',
      'Occupied Units',
      'Vacancy Rate %',
      'Occupancy Rate %',
      'Scheduled Rent',
      'Collected Rent',
      'Outstanding Rent',
      'Paid Operating Expenses',
      'Operating Cash Flow',
      'Security Deposits Held',
    ];
    const rows = reportData.map(({ prop, occ, fin }) => [
      reportType,
      prop.code,
      prop.name,
      occ.totalUnits,
      occ.occupiedUnits,
      occ.vacancyRate,
      occ.occupancyRate,
      fin.scheduledRent,
      fin.collectedRent,
      fin.outstandingRent,
      fin.paidOperatingExpenses,
      fin.operatingCashFlow,
      fin.securityDepositsHeld,
    ]);
    downloadCsvFile(
      `estavia-${reportType.toLowerCase().replace(/\s+/g, '-')}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporting Center</h1>
          <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
            Generate, filter, print, and export CSV reports across all 11 operational and financial categories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              setReportType(
                reportType === 'Maintenance Report'
                  ? 'Operating Performance Report'
                  : 'Maintenance Report'
              )
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
              reportType === 'Maintenance Report'
                ? 'bg-[#E9F5F1] dark:bg-[#203530] border-[#146C63] text-[#146C63] dark:text-[#5BC4B4]'
                : 'border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Open Work Orders Report</span>
          </button>
          <button
            type="button"
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] text-white text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report CSV</span>
          </button>
        </div>
      </div>

      {/* Report Selector & Saved Configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#71807B] mb-1">
                Report Template (11 Types)
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-medium"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71807B] mb-1">
                Property Scope
              </label>
              <select
                value={propFilter}
                onChange={(e) => setPropFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
              >
                <option value="all">Entire Portfolio</option>
                {dataset.properties
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <form
            className="flex gap-2 pt-2 border-t border-[#E1E9E5] dark:border-[#304540]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!presetName.trim()) return;
              saveReportConfig({
                name: presetName.trim(),
                reportType,
                propertyId: propFilter,
                dateRange: selectedPeriod,
              });
              setPresetName('');
            }}
          >
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Save current filter configuration as preset..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Preset</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-4 p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#71807B]">
              Saved Report Configurations ({dataset.savedReports.length})
            </h2>
            <Link
              href="/dashboard/maintenance/report"
              className="text-[11px] font-medium text-[#146C63] dark:text-[#5BC4B4] hover:underline"
            >
              Full Maintenance Report →
            </Link>
          </div>
          <div className="space-y-2">
            {dataset.savedReports.map((rep) => (
              <div
                key={rep.id}
                className="p-2.5 rounded-lg bg-[#F8FAF9] dark:bg-[#121F1D] flex items-center justify-between gap-2 text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    setReportType(rep.reportType);
                    setPropFilter(rep.propertyId);
                  }}
                  className="text-left hover:underline font-medium truncate"
                >
                  {rep.name}
                  <span className="block text-[10px] text-[#71807B]">
                    {rep.reportType}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedReport(rep.id)}
                  className="text-[#71807B] hover:text-[#DC2626]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specialized Portfolio Open Work Orders Maintenance Report vs Property Financial Table */}
      {reportType === 'Maintenance Report' ? (
        <MaintenanceReportView embedded />
      ) : (
        <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
          <div className="px-5 py-4 border-b border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between">
            <h2 className="text-sm font-semibold">{reportType}</h2>
            <span className="text-xs font-mono text-[#71807B]">
              Period: {selectedPeriod}
            </span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4 text-right">Units (Occ/Total)</th>
                <th className="py-3 px-4 text-right">Occupancy %</th>
                <th className="py-3 px-4 text-right">Scheduled Rent</th>
                <th className="py-3 px-4 text-right">Collected Rent</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Paid Expenses</th>
                <th className="py-3 px-4 text-right">Operating Cash Flow</th>
                <th className="py-3 px-4 text-right">Deposits Held</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
              {reportData.map(({ prop, occ, fin }) => (
                <tr key={prop.id}>
                  <td className="py-3 px-4 font-semibold">
                    {prop.name}{' '}
                    <span className="font-mono text-[#71807B]">
                      ({prop.code})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {occ.occupiedUnits} / {occ.totalUnits}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669]">
                    {occ.occupancyRate}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(fin.scheduledRent)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#059669]">
                    {formatCurrency(fin.collectedRent)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#DC2626]">
                    {formatCurrency(fin.outstandingRent)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(fin.paidOperatingExpenses)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#146C63] dark:text-[#5BC4B4]">
                    {formatCurrency(fin.operatingCashFlow)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrency(fin.securityDepositsHeld)}
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
