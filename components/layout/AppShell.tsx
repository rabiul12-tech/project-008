'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity as ActivityIcon,
  BarChart3,
  Bell,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  DoorOpen,
  FileBarChart,
  FileSignature,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Menu,
  Moon,
  PieChart,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useEstaviaStore, QuickModalType } from '@/stores/useEstaviaStore';
import { QuickCreateModals } from '@/components/modals/QuickCreateModals';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Portfolio', href: '/dashboard/portfolio', icon: Layers },
      { label: 'Properties', href: '/dashboard/properties', icon: Building2 },
      { label: 'Units', href: '/dashboard/units', icon: DoorOpen },
      { label: 'Unit Explorer', href: '/dashboard/units/explorer', icon: Building },
    ],
  },
  {
    group: 'Leasing',
    items: [
      { label: 'Tenants', href: '/dashboard/tenants', icon: Users },
      { label: 'Leases', href: '/dashboard/leases', icon: FileSignature },
      { label: 'Applications', href: '/dashboard/applications', icon: FileText },
      { label: 'Occupancy', href: '/dashboard/occupancy', icon: PieChart },
    ],
  },
  {
    group: 'Financial',
    items: [
      { label: 'Rent Collection', href: '/dashboard/rent', icon: CreditCard },
      { label: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
      { label: 'Security Deposits', href: '/dashboard/deposits', icon: ShieldCheck },
      { label: 'Expenses', href: '/dashboard/expenses', icon: BarChart3 },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
      { label: 'Maintenance Report', href: '/dashboard/maintenance/report', icon: FileBarChart },
      { label: 'Vendors', href: '/dashboard/vendors', icon: UserCheck },
      { label: 'Inspections', href: '/dashboard/inspections', icon: ClipboardCheck },
    ],
  },
  {
    group: 'Insights',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Reports', href: '/dashboard/reports', icon: FileBarChart },
      { label: 'Activity', href: '/dashboard/activity', icon: ActivityIcon },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Team', href: '/dashboard/team', icon: Users },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Help', href: '/dashboard/help', icon: HelpCircle },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    hydrated,
    hydrate,
    dataset,
    settings,
    selectedPropertyId,
    setSelectedPropertyId,
    selectedPeriod,
    setSelectedPeriod,
    theme,
    toggleTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    setQuickModal,
    toast,
    clearToast,
  } = useEstaviaStore();

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => clearToast(), 4500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  const activeProperties = dataset.properties.filter((p) => !p.archived);

  // Build readable breadcrumbs
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, idx) => {
    const href = '/' + pathSegments.slice(0, idx + 1).join('/');
    let label = seg.charAt(0).toUpperCase() + seg.slice(1);
    if (seg.startsWith('prop-')) {
      const p = dataset.properties.find((item) => item.id === seg);
      if (p) label = p.name;
    } else if (seg.startsWith('ten-')) {
      const t = dataset.tenants.find((item) => item.id === seg);
      if (t) label = t.fullName;
    } else if (seg.startsWith('lease-')) {
      const l = dataset.leases.find((item) => item.id === seg);
      if (l) label = l.code;
    }
    return { label, href };
  });

  const quickActions: Array<{ label: string; modal: QuickModalType }> = [
    { label: 'Add Property', modal: 'add-property' },
    { label: 'Add Unit', modal: 'add-unit' },
    { label: 'Add Tenant', modal: 'add-tenant' },
    { label: 'Create Lease', modal: 'create-lease' },
    { label: 'Record Rent Payment', modal: 'record-payment' },
    { label: 'Create Maintenance Request', modal: 'create-maintenance' },
    { label: 'Record Expense', modal: 'record-expense' },
  ];

  const isNavItemActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/units' || href === '/dashboard/maintenance') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAF9] dark:bg-[#0D1514] text-[#1C2927] dark:text-[#F7FAF8]">
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Primary Workspace Navigation"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#121F1D] transition-transform duration-200 lg:static lg:translate-x-0 no-print ${
          mobileNavOpen ? 'translate-x-0 w-64' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand & Portfolio Workspace Header */}
        <div className="px-4 py-4 border-b border-[#E1E9E5] dark:border-[#304540] flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#146C63] flex items-center justify-center text-white font-bold text-sm shrink-0">
              E
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="block text-sm font-bold tracking-tight text-[#1C2927] dark:text-[#F7FAF8] truncate">
                  ESTAVIA
                </span>
                <span className="block text-[11px] text-[#71807B] dark:text-[#9CB0AA] truncate">
                  {settings.companyName}
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="p-1.5 rounded-lg lg:hidden text-[#71807B]"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.group}>
              {!sidebarCollapsed && (
                <p className="px-2.5 mb-1.5 text-[11px] font-semibold tracking-wider text-[#71807B] dark:text-[#9CB0AA]">
                  {grp.group}
                </p>
              )}
              <div className="space-y-0.5">
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#E9F5F1] dark:bg-[#203530] text-[#146C63] dark:text-[#5BC4B4]'
                          : 'text-[#71807B] dark:text-[#9CB0AA] hover:text-[#1C2927] dark:hover:text-[#F7FAF8] hover:bg-[#F8FAF9] dark:hover:bg-[#192A27]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Demo Profile, Theme & Collapse Control */}
        <div className="p-3 border-t border-[#E1E9E5] dark:border-[#304540] space-y-2">
          {!sidebarCollapsed && (
            <div className="px-2 py-1.5 rounded-lg bg-[#F8FAF9] dark:bg-[#192A27] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#146C63]/15 text-[#146C63] dark:text-[#5BC4B4] flex items-center justify-center text-xs font-semibold shrink-0">
                AM
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">Alexander Mercer</p>
                <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA] truncate">
                  VP Portfolio Operations
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E1E9E5] dark:border-[#304540] hover:bg-[#F8FAF9] dark:hover:bg-[#192A27] transition-colors"
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#D6AE72]" />
                  {!sidebarCollapsed && <span>Light</span>}
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#146C63]" />
                  {!sidebarCollapsed && <span>Dark</span>}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] hover:bg-[#F8FAF9] dark:hover:bg-[#192A27] text-[#71807B]"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-14 px-4 lg:px-6 border-b border-[#E1E9E5] dark:border-[#304540] bg-white/95 dark:bg-[#121F1D]/95 backdrop-blur flex items-center justify-between gap-4 no-print">
          {/* Left: Mobile Menu + Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="p-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
              <Link
                href="/"
                className="text-[#71807B] dark:text-[#9CB0AA] hover:text-[#1C2927] dark:hover:text-white whitespace-nowrap"
              >
                Estavia
              </Link>
              {breadcrumbs.map((bc, idx) => (
                <React.Fragment key={bc.href}>
                  <span className="text-[#71807B] dark:text-[#9CB0AA]" aria-hidden="true">
                    /
                  </span>
                  <Link
                    href={bc.href}
                    className={`truncate max-w-[160px] sm:max-w-[220px] ${
                      idx === breadcrumbs.length - 1
                        ? 'font-semibold text-[#1C2927] dark:text-[#F7FAF8]'
                        : 'text-[#71807B] dark:text-[#9CB0AA] hover:text-[#1C2927] dark:hover:text-white'
                    }`}
                  >
                    {bc.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Global Search, Property Selector, Period Selector, Quick Create, Notifications */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={() => setQuickModal('global-search')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#192A27] text-xs text-[#71807B] dark:text-[#9CB0AA] hover:border-[#146C63] transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search portfolio...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-[#121F1D] rounded border border-[#E1E9E5] dark:border-[#304540]">
                ⌘K
              </kbd>
            </button>

            {/* Global Property Filter */}
            <select
              aria-label="Global Property Filter"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="hidden xl:block px-2.5 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#192A27] text-xs font-medium max-w-[210px] truncate"
            >
              <option value="all">All Properties ({activeProperties.length})</option>
              {activeProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Billing Period Filter */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#192A27] text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#146C63] dark:text-[#5BC4B4]" />
              <select
                aria-label="Billing Period Selector"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              >
                <option value="2026-11">Nov 2026</option>
                <option value="2026-10">Oct 2026</option>
                <option value="2026-09">Sep 2026</option>
                <option value="all">All Periods (12M)</option>
              </select>
            </div>

            {/* Quick Create Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setQuickCreateOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Create</span>
              </button>
              {quickCreateOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setQuickCreateOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] shadow-lg py-1.5 z-20">
                    {quickActions.map((act) => (
                      <button
                        key={act.label}
                        type="button"
                        onClick={() => {
                          setQuickCreateOpen(false);
                          setQuickModal(act.modal);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-[#E9F5F1] dark:hover:bg-[#203530] flex items-center justify-between"
                      >
                        <span>{act.label}</span>
                        <Plus className="w-3 h-3 text-[#71807B]" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recent Activity / Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="p-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] hover:bg-[#F8FAF9] dark:hover:bg-[#192A27] text-[#71807B]"
                aria-label="Recent operational alerts"
              >
                <Bell className="w-4 h-4" />
              </button>
              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] shadow-lg p-3 z-20">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E9E5] dark:border-[#304540]">
                      <span className="text-xs font-semibold">Recent Portfolio Events</span>
                      <Link
                        href="/dashboard/activity"
                        onClick={() => setNotifOpen(false)}
                        className="text-[11px] text-[#146C63] dark:text-[#5BC4B4] hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {dataset.activities.slice(0, 5).map((act) => (
                        <div key={act.id} className="text-xs">
                          <p className="font-medium text-[#1C2927] dark:text-[#F7FAF8]">
                            {act.title}
                          </p>
                          <p className="text-[11px] text-[#71807B] dark:text-[#9CB0AA] line-clamp-1">
                            {act.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Toast Banner */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] shadow-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#059669] dark:text-[#10B981] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#1C2927] dark:text-[#F7FAF8]">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-0.5">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clearToast}
              className="text-[#71807B] hover:text-[#1C2927] dark:hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {!hydrated ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-8 w-64 rounded-lg bg-[#E1E9E5] dark:bg-[#203530]" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 rounded-xl bg-white dark:bg-[#192A27] border border-[#E1E9E5] dark:border-[#304540]"
                  />
                ))}
              </div>
              <div className="h-96 rounded-xl bg-white dark:bg-[#192A27] border border-[#E1E9E5] dark:border-[#304540]" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Global Quick Modals & Command Palette */}
      <QuickCreateModals />
    </div>
  );
}
