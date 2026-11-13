'use client';

import React from 'react';

const HELP_SECTIONS = [
  {
    title: '01. Getting Started & Portfolio Architecture',
    body: 'ESTAVIA is a browser-local property and rental management application. Upon launch, a deterministic 12-property portfolio is initialized in LocalStorage (`estavia:data`) with interconnected buildings, floors, units, tenants, leases, rent rolls, security deposits, expenses, and maintenance work orders.',
  },
  {
    title: '02. Property & Interactive Unit Management',
    body: 'Properties organize physical buildings, floors, and units. Unit occupancy is never stored as an arbitrary static flag—it is derived in real time from effective active leases (`startDate <= referenceDate < endDate`) and availability modes (`Reserved`, `Under Maintenance`, `Unavailable`). Duplicate unit numbers within the same property and building are prevented.',
  },
  {
    title: '03. Lease Lifecycle Engine & Half-Open Date Intervals',
    body: 'All leases use half-open date intervals `[startDate, endDate)`. Two leases overlap if and only if `startA < endB AND startB < endA`. This allows back-to-back leases where one tenant moves out on `2026-12-01` and the next lease starts on `2026-12-01` without conflict, while strictly blocking overlapping Active or Scheduled leases.',
  },
  {
    title: '04. Idempotent Rent Generation & Decimal.js Precision',
    body: 'Monthly rent charges use the idempotency identity `leaseId:billingPeriod:chargeType`. Clicking "Generate Monthly Charges" multiple times for the same period skips existing charges and never creates duplicate invoices. Partial payments, full payments, credits, and reversals are calculated using Decimal.js.',
  },
  {
    title: '05. Security Deposits vs Operating Revenue',
    body: 'Security deposits are tracked in a dedicated deposit ledger (`Receipt`, `Deduction`, `Return`) and are strictly excluded from Scheduled Rent, Collected Rent, and Operating Cash Flow.',
  },
  {
    title: '06. Maintenance Kanban & Single-Source Expense Syncing',
    body: 'Maintenance work orders progress through 7 validated stages (`New` → `Reviewed` → `Assigned` → `In Progress` → `Resolved` → `Closed`, plus `Cancelled`). Recording an actual repair cost creates or updates a single linked expense record so maintenance costs are never double-counted.',
  },
  {
    title: '07. LocalStorage Limitations & Data Backup',
    body: 'All records persist in browser LocalStorage (~5MB quota). Use Settings → Download JSON Backup to export a portable snapshot or Restore from JSON Backup (validated via Zod and referential integrity checks).',
  },
];

export default function HelpDocumentationPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          ESTAVIA Documentation & Operational Guide
        </h1>
        <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
          Reference guide for lease interval math, occupancy derivation, financial formulas, and LocalStorage persistence.
        </p>
      </div>

      <div className="space-y-4">
        {HELP_SECTIONS.map((sec) => (
          <div
            key={sec.title}
            className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-2"
          >
            <h2 className="text-sm font-semibold text-[#1C2927] dark:text-[#F7FAF8]">
              {sec.title}
            </h2>
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] leading-relaxed">
              {sec.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
