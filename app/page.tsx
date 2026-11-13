'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSignature,
  Layers,
  PieChart,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { calculateOccupancySummary } from '@/lib/engines/occupancy-engine';
import { calculateFinancialSummary } from '@/lib/engines/financial-engine';
import { formatCurrency } from '@/lib/export/exporter';
import { PropertyArtwork } from '@/components/ui/PropertyArtwork';

export default function LandingPage() {
  const { hydrated, hydrate, dataset, settings } = useEstaviaStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const activeProperties = dataset.properties.filter((p) => !p.archived);
  const occ = calculateOccupancySummary(
    dataset.units,
    dataset.leases,
    dataset.referenceDate
  );
  const fin = calculateFinancialSummary({
    rentCharges: dataset.rentCharges,
    expenses: dataset.expenses,
    depositTransactions: dataset.depositTransactions,
    billingPeriod: '2026-11',
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9] dark:bg-[#0D1514] text-[#1C2927] dark:text-[#F7FAF8]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#121F1D]">
        {/* Zone 1: Brand Wordmark */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[#1C2927] dark:text-[#F7FAF8] whitespace-nowrap shrink-0"
        >
          ESTAVIA
        </Link>

        {/* Zone 2: 4-5 Concise Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#71807B] dark:text-[#9CB0AA]">
          <Link
            href="/dashboard/portfolio"
            className="hover:text-[#1C2927] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Portfolio
          </Link>
          <Link
            href="/dashboard/units/explorer"
            className="hover:text-[#1C2927] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Unit Explorer
          </Link>
          <Link
            href="/dashboard/leases"
            className="hover:text-[#1C2927] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Leasing
          </Link>
          <Link
            href="/dashboard/rent"
            className="hover:text-[#1C2927] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Rent Ledger
          </Link>
          <Link
            href="/dashboard/maintenance"
            className="hover:text-[#1C2927] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Operations
          </Link>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-xs font-medium text-white bg-[#146C63] hover:bg-[#105A52] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Launch Workspace
          </Link>
        </div>
      </header>

      {/* Hero Split Section */}
      <section className="max-w-7xl w-full mx-auto px-6 lg:px-12 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-[#146C63] dark:text-[#5BC4B4]">
                Enterprise Property & Real Estate Operations Platform · {settings.companyName}
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1C2927] dark:text-[#F7FAF8] leading-[1.12] [text-wrap:balance]">
                Every Property. Perfectly Managed.
              </h1>
              <p className="text-base text-[#71807B] dark:text-[#9CB0AA] max-w-2xl leading-relaxed">
                Manage residential towers, commercial plazas, and mixed-use portfolios in one unified browser-local workspace. Engineered with half-open lease conflict validation, idempotent rent generation, Decimal.js financial precision, and interactive building hierarchy views.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <span>Enter Live Demo Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/units/explorer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] hover:bg-[#E9F5F1] dark:hover:bg-[#203530] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Building className="w-4 h-4 text-[#146C63] dark:text-[#5BC4B4]" />
                <span>Interactive Building Explorer</span>
              </Link>
            </div>

            <div className="pt-4 border-t border-[#E1E9E5] dark:border-[#304540] flex flex-wrap items-center gap-4 text-xs text-[#71807B] dark:text-[#9CB0AA]">
              <span>Zero Login Required</span>
              <span aria-hidden="true">·</span>
              <span>100% Browser-Local Persistence</span>
              <span aria-hidden="true">·</span>
              <span>Deterministic Portfolio Dataset</span>
            </div>
          </div>

          {/* Right Architectural Showcase Card */}
          <div className="lg:col-span-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-hidden flex flex-col justify-between">
            <PropertyArtwork
              propertyId="prop-1"
              propertyName="The Sovereign at Gramercy"
              propertyType="Apartment Building"
              city="New York, NY"
              heightClass="h-56"
            />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#71807B] dark:text-[#9CB0AA]">
                <span>Live Workspace Snapshot (Nov 2026)</span>
                <span className="font-mono text-[#059669] dark:text-[#10B981]">
                  {hydrated ? `${occ.occupancyRate}% Occupied` : 'Loading...'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E1E9E5] dark:border-[#304540]">
                <div>
                  <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                    Monthly Scheduled Rent
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums mt-0.5">
                    {formatCurrency(fin.scheduledRent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                    Nov Rent Collected
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-[#059669] dark:text-[#10B981] mt-0.5">
                    {formatCurrency(fin.collectedRent)}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/properties/prop-1"
                className="block w-full text-center py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium hover:bg-[#F8FAF9] dark:hover:bg-[#203530] transition-colors"
              >
                Inspect Property 360° Workspace →
              </Link>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Portfolio KPI Strip */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Managed Properties</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {activeProperties.length}
            </p>
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
              Across 12 North American markets
            </p>
          </div>
          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Total Leasable Units</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {occ.totalEligibleLeasableUnits}
            </p>
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
              {occ.occupiedUnits} occupied · {occ.vacantUnits} vacant
            </p>
          </div>
          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Collection Rate (Nov 2026)</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1 text-[#146C63] dark:text-[#5BC4B4]">
              {fin.collectionRate}%
            </p>
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
              {formatCurrency(fin.outstandingRent)} outstanding
            </p>
          </div>
          <div className="p-5 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]">
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">Security Deposits Held</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {formatCurrency(fin.securityDepositsHeld)}
            </p>
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
              Segregated from operating revenue
            </p>
          </div>
        </div>
      </section>

      {/* Signature Workspaces Grid */}
      <section className="max-w-7xl w-full mx-auto px-6 lg:px-12 py-12 border-t border-[#E1E9E5] dark:border-[#304540]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              01. Core Real Estate Operations Workspaces
            </h2>
            <p className="text-sm text-[#71807B] dark:text-[#9CB0AA] mt-1">
              Direct access to every connected module in the ESTAVIA platform.
            </p>
          </div>
          <Link
            href="/dashboard/portfolio"
            className="text-xs font-medium text-[#146C63] dark:text-[#5BC4B4] hover:underline"
          >
            Explore All 25 Workspaces →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              title: 'Property Portfolio & 360° Command',
              desc: 'Inspect property performance, architectural unit mix, rent rolls, inspections, and historical activity per building.',
              href: '/dashboard/portfolio',
              icon: Layers,
            },
            {
              title: 'Interactive Building & Unit Explorer',
              desc: 'Visual Property → Building → Floor → Unit hierarchy with live occupancy derivation and unit detail drawer.',
              href: '/dashboard/units/explorer',
              icon: Building,
            },
            {
              title: 'Tenant 360° Profiles & Applications',
              desc: 'Complete tenant ledgers, lease histories, maintenance logs, and 1-click rental application conversion.',
              href: '/dashboard/tenants',
              icon: Users,
            },
            {
              title: 'Lease Lifecycle & Conflict Engine',
              desc: 'Enforces half-open [startDate, endDate) intervals to prevent overlapping exclusive leases and streamline renewals.',
              href: '/dashboard/leases',
              icon: FileSignature,
            },
            {
              title: 'Idempotent Rent Roll & Ledger',
              desc: 'Generate monthly rent charges without duplicates, record partial/full payments, reverse errors, and export receipts.',
              href: '/dashboard/rent',
              icon: CreditCard,
            },
            {
              title: 'Maintenance Work Order Kanban',
              desc: 'Drag-and-drop or keyboard-transition work orders across 7 stages with single-source expense cost syncing.',
              href: '/dashboard/maintenance',
              icon: Wrench,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] hover:border-[#146C63] dark:hover:border-[#5BC4B4] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-[#E9F5F1] dark:bg-[#203530] text-[#146C63] dark:text-[#5BC4B4] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C2927] dark:text-[#F7FAF8] group-hover:text-[#146C63] dark:group-hover:text-[#5BC4B4] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-2 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#146C63] dark:text-[#5BC4B4] mt-5">
                  Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#121F1D] px-6 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71807B] dark:text-[#9CB0AA]">
          <p>
            ESTAVIA — Project 009 Portfolio Demonstration. All records are fictional and stored locally in your browser.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/dashboard/settings" className="hover:underline">
              Backup & Restore
            </Link>
            <Link href="/dashboard/help" className="hover:underline">
              Documentation
            </Link>
            <Link href="/dashboard" className="hover:underline font-medium text-[#146C63] dark:text-[#5BC4B4]">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
