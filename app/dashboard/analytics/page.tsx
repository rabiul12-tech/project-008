'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { calculateOccupancySummary } from '@/lib/engines/occupancy-engine';
import { calculateFinancialSummary } from '@/lib/engines/financial-engine';
import { formatCurrency } from '@/lib/export/exporter';

export default function PropertyAnalyticsPage() {
  const { dataset, selectedPropertyId, selectedPeriod } = useEstaviaStore();

  const occ = useMemo(() => {
    const units = dataset.units.filter(
      (u) =>
        !u.archived &&
        (selectedPropertyId === 'all' || u.propertyId === selectedPropertyId)
    );
    return calculateOccupancySummary(units, dataset.leases, dataset.referenceDate);
  }, [dataset, selectedPropertyId]);

  const fin = useMemo(
    () =>
      calculateFinancialSummary({
        rentCharges: dataset.rentCharges,
        expenses: dataset.expenses,
        depositTransactions: dataset.depositTransactions,
        propertyId: selectedPropertyId,
        billingPeriod: selectedPeriod,
      }),
    [dataset, selectedPropertyId, selectedPeriod]
  );

  const propertyComparison = useMemo(() => {
    return dataset.properties
      .filter((p) => !p.archived)
      .map((prop) => {
        const pUnits = dataset.units.filter(
          (u) => !u.archived && u.propertyId === prop.id
        );
        const pOcc = calculateOccupancySummary(
          pUnits,
          dataset.leases,
          dataset.referenceDate
        );
        const pFin = calculateFinancialSummary({
          rentCharges: dataset.rentCharges,
          expenses: dataset.expenses,
          depositTransactions: dataset.depositTransactions,
          propertyId: prop.id,
          billingPeriod: selectedPeriod,
        });
        return {
          name: prop.name.split(' ').slice(0, 2).join(' '),
          collectedRent: pFin.collectedRent,
          expenses: pFin.paidOperatingExpenses,
          cashFlow: pFin.operatingCashFlow,
          occupancyRate: pOcc.occupancyRate,
        };
      });
  }, [dataset, selectedPeriod]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Portfolio & Property Financial Analytics
        </h1>
        <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
          All calculations use Decimal.js precision on active local records. Security deposits are excluded from rental income and operating cash flow.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Occupancy Rate</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#059669] mt-1">
            {occ.occupancyRate}%
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Scheduled Rent</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-1">
            {formatCurrency(fin.scheduledRent)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Collected Rent</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#146C63] dark:text-[#5BC4B4] mt-1">
            {formatCurrency(fin.collectedRent)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Collection Rate</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-1">
            {fin.collectionRate}%
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Paid Expenses</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#D97706] mt-1">
            {formatCurrency(fin.paidOperatingExpenses)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <p className="text-xs text-[#71807B]">Operating Cash Flow</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#059669] mt-1">
            {formatCurrency(fin.operatingCashFlow)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <h2 className="text-sm font-semibold mb-4">
            Collected Rent vs Paid Operating Expenses by Property
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E9E5" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Bar dataKey="collectedRent" name="Collected Rent" fill="#146C63" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Paid Expenses" fill="#C99B58" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
          <h2 className="text-sm font-semibold mb-4">
            Net Operating Cash Flow by Property
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E9E5" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Bar dataKey="cashFlow" name="Operating Cash Flow" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Documented Calculation Definitions */}
      <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-2 text-xs">
        <h2 className="text-sm font-semibold">Documented Calculation Definitions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[#71807B] dark:text-[#9CB0AA] font-mono">
          <p>• Scheduled Rent = Sum of Valid Rent Charges for Selected Period</p>
          <p>• Collected Rent = Sum of Valid Allocated Rent Payments</p>
          <p>• Outstanding Rent = Valid Rent Charges − Allocated Payments − Applicable Credits</p>
          <p>• Collection Rate = Collected Rent / Eligible Rent Charges × 100</p>
          <p>• Operating Cash Flow = Actual Cash Receipts − Actual Paid Operating Expenses</p>
          <p>• Occupancy Rate = Occupied Leasable Units / Total Eligible Leasable Units × 100</p>
        </div>
      </div>
    </div>
  );
}
