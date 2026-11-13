'use client';

import { create } from 'zustand';
import {
  Activity,
  Building,
  EstaviaDataset,
  Floor,
  Inspection,
  Lease,
  LeaseStatus,
  MaintenanceComment,
  MaintenanceRequest,
  MaintenanceStage,
  Property,
  PropertyExpense,
  RentPayment,
  RentalApplication,
  SavedReport,
  SecurityDepositTransaction,
  Tenant,
  Unit,
  Vendor,
  WorkspaceSettings,
} from '../lib/types';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  generateDeterministicDemoDataset,
} from '../lib/seed/demo-seed';
import {
  loadDatasetFromStorage,
  loadSettingsFromStorage,
  parseAndValidateBackupJson,
  saveDatasetToStorage,
  saveSettingsToStorage,
} from '../lib/storage/repository';
import {
  createLeaseRenewalRecord,
  RenewLeaseInput,
  validateLease,
} from '../lib/engines/lease-engine';
import {
  generateMonthlyRentCharges,
  recalculateRentChargeState,
  recordPaymentAgainstCharge,
  reverseRentPayment,
} from '../lib/engines/rent-engine';
import {
  syncMaintenanceActualCostToExpense,
  transitionMaintenanceStage,
} from '../lib/engines/maintenance-engine';

export type QuickModalType =
  | null
  | 'add-property'
  | 'add-unit'
  | 'add-tenant'
  | 'create-lease'
  | 'record-payment'
  | 'create-maintenance'
  | 'record-expense'
  | 'global-search';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'success' | 'warning' | 'danger';
}

interface EstaviaState {
  hydrated: boolean;
  dataset: EstaviaDataset;
  settings: WorkspaceSettings;
  selectedPropertyId: string; // 'all' or property.id
  selectedPeriod: string;     // '2026-11', '2026-10', '2026-09', or 'all'
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  quickModal: QuickModalType;
  toast: ToastMessage | null;

  // Initialization & UI actions
  hydrate: () => void;
  setSelectedPropertyId: (id: string) => void;
  setSelectedPeriod: (period: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setQuickModal: (modal: QuickModalType) => void;
  showToast: (title: string, description?: string, variant?: ToastMessage['variant']) => void;
  clearToast: () => void;

  // Property CRUD
  addProperty: (
    input: Omit<Property, 'id' | 'createdAt'>
  ) => { ok: boolean; property?: Property; error?: string };
  updateProperty: (
    id: string,
    updates: Partial<Property>
  ) => { ok: boolean; error?: string };
  archiveProperty: (id: string) => { ok: boolean };
  duplicateProperty: (id: string) => { ok: boolean; property?: Property };

  // Unit CRUD
  addUnit: (
    input: Omit<Unit, 'id' | 'buildingId' | 'floorId'> & {
      buildingId?: string;
      floorId?: string;
    }
  ) => { ok: boolean; unit?: Unit; error?: string };
  updateUnit: (
    id: string,
    updates: Partial<Unit>
  ) => { ok: boolean; error?: string };
  archiveUnit: (id: string) => { ok: boolean };

  // Tenant CRUD
  addTenant: (
    input: Omit<Tenant, 'id' | 'code' | 'fullName' | 'createdAt'>
  ) => { ok: boolean; tenant?: Tenant; error?: string };
  updateTenant: (id: string, updates: Partial<Tenant>) => { ok: boolean };
  archiveTenant: (id: string) => { ok: boolean };

  // Application CRUD & Conversion
  addApplication: (
    input: Omit<RentalApplication, 'id' | 'code'>
  ) => { ok: boolean; application?: RentalApplication };
  updateApplicationStatus: (
    id: string,
    status: RentalApplication['status'],
    notes?: string
  ) => { ok: boolean; error?: string };
  convertApplicationToLease: (
    applicationId: string,
    leaseDates: { startDate: string; endDate: string; securityDeposit: number }
  ) => { ok: boolean; errors: string[]; lease?: Lease; tenant?: Tenant };

  // Lease Lifecycle
  createLease: (
    input: Omit<Lease, 'id' | 'code' | 'createdAt'>
  ) => { ok: boolean; errors: string[]; lease?: Lease };
  updateLease: (
    id: string,
    updates: Partial<Lease>
  ) => { ok: boolean; errors: string[] };
  changeLeaseStatus: (
    id: string,
    newStatus: LeaseStatus,
    meta?: { terminationDate?: string; terminationReason?: string }
  ) => { ok: boolean; errors: string[] };
  renewLease: (
    input: RenewLeaseInput
  ) => { ok: boolean; errors: string[]; newLease?: Lease };

  // Rent & Payments
  generateMonthlyRent: (
    billingPeriod: string
  ) => { createdCount: number; skippedCount: number };
  recordRentPayment: (params: {
    rentChargeId: string;
    amount: number;
    type: 'Payment' | 'Credit';
    method: RentPayment['method'];
    date: string;
    reference: string;
    notes: string;
  }) => { ok: boolean; error?: string };
  reversePayment: (
    paymentId: string,
    reason: string
  ) => { ok: boolean; error?: string };

  // Security Deposits
  recordDepositTransaction: (
    input: Omit<SecurityDepositTransaction, 'id' | 'code'>
  ) => { ok: boolean; transaction?: SecurityDepositTransaction };

  // Expenses
  addExpense: (
    input: Omit<PropertyExpense, 'id' | 'code'>
  ) => { ok: boolean; expense?: PropertyExpense };
  updateExpense: (id: string, updates: Partial<PropertyExpense>) => { ok: boolean };
  archiveExpense: (id: string) => { ok: boolean };

  // Maintenance
  addMaintenanceRequest: (
    input: Omit<MaintenanceRequest, 'id' | 'code' | 'comments' | 'actualCost'> & {
      actualCost?: number;
    }
  ) => { ok: boolean; request?: MaintenanceRequest; error?: string };
  updateMaintenanceRequest: (
    id: string,
    updates: Partial<MaintenanceRequest>
  ) => { ok: boolean };
  moveMaintenanceStage: (
    id: string,
    stage: MaintenanceStage
  ) => { ok: boolean; error?: string };
  addMaintenanceComment: (
    requestId: string,
    content: string,
    authorName?: string
  ) => { ok: boolean };
  recordMaintenanceCost: (
    requestId: string,
    actualCost: number
  ) => { ok: boolean };

  // Vendors
  addVendor: (input: Omit<Vendor, 'id' | 'code'>) => { ok: boolean; vendor?: Vendor };
  updateVendor: (id: string, updates: Partial<Vendor>) => { ok: boolean };
  archiveVendor: (id: string) => { ok: boolean };

  // Inspections
  addInspection: (
    input: Omit<Inspection, 'id' | 'code'>
  ) => { ok: boolean; inspection?: Inspection };
  updateInspection: (id: string, updates: Partial<Inspection>) => { ok: boolean };

  // Reports & Settings
  saveReportConfig: (
    input: Omit<SavedReport, 'id' | 'createdAt'>
  ) => { ok: boolean };
  deleteSavedReport: (id: string) => void;
  updateSettings: (updates: Partial<WorkspaceSettings>) => void;
  restoreFromBackupJson: (rawJson: string) => { ok: boolean; errors: string[] };
  resetDemoWorkspace: () => void;
}

function appendActivity(
  dataset: EstaviaDataset,
  entry: Omit<Activity, 'id' | 'timestamp'>
): Activity[] {
  const newAct: Activity = {
    ...entry,
    id: `act-${Date.now()}-${dataset.activities.length + 1}`,
    timestamp: new Date().toISOString(),
  };
  return [newAct, ...dataset.activities];
}

export const useEstaviaStore = create<EstaviaState>((set, get) => ({
  hydrated: false,
  dataset: generateDeterministicDemoDataset(),
  settings: DEFAULT_WORKSPACE_SETTINGS,
  selectedPropertyId: 'all',
  selectedPeriod: '2026-11',
  theme: 'light',
  sidebarCollapsed: false,
  mobileNavOpen: false,
  quickModal: null,
  toast: null,

  hydrate: () => {
    if (get().hydrated) return;
    const { dataset, recoveredFromCorruption } = loadDatasetFromStorage();
    const settings = loadSettingsFromStorage();

    let savedTheme: 'light' | 'dark' = 'light';
    let savedCollapsed = false;
    if (typeof window !== 'undefined') {
      try {
        const uiRaw = window.localStorage.getItem('estavia:ui');
        if (uiRaw) {
          const parsedUi = JSON.parse(uiRaw);
          if (parsedUi.theme === 'dark' || parsedUi.theme === 'light') {
            savedTheme = parsedUi.theme;
          }
          if (typeof parsedUi.sidebarCollapsed === 'boolean') {
            savedCollapsed = parsedUi.sidebarCollapsed;
          }
        }
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } catch {
        // ignore UI storage error
      }
    }

    set({
      hydrated: true,
      dataset,
      settings,
      theme: savedTheme,
      sidebarCollapsed: savedCollapsed,
      toast: recoveredFromCorruption
        ? {
            id: 'corrupt-recovery',
            title: 'Demo Workspace Restored',
            description: 'Corrupted local data was detected and automatically reset to a clean state.',
            variant: 'warning',
          }
        : null,
    });
  },

  setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      try {
        window.localStorage.setItem(
          'estavia:ui',
          JSON.stringify({ theme, sidebarCollapsed: get().sidebarCollapsed })
        );
      } catch {
        // ignore
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },

  setSidebarCollapsed: (collapsed) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'estavia:ui',
          JSON.stringify({ theme: get().theme, sidebarCollapsed: collapsed })
        );
      } catch {
        // ignore
      }
    }
    set({ sidebarCollapsed: collapsed });
  },

  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setQuickModal: (modal) => set({ quickModal: modal }),

  showToast: (title, description, variant = 'success') => {
    const id = `toast-${Date.now()}`;
    set({ toast: { id, title, description, variant } });
  },

  clearToast: () => set({ toast: null }),

  addProperty: (input) => {
    const { dataset } = get();
    if (!input.name.trim()) {
      return { ok: false, error: 'Property name is required.' };
    }
    const nextIdx = dataset.properties.length + 1;
    const propId = `prop-${nextIdx}-${Date.now().toString().slice(-4)}`;
    const newProperty: Property = {
      ...input,
      id: propId,
      code: input.code?.trim() || `EST-PRP-${String(nextIdx).padStart(2, '0')}`,
      createdAt: dataset.referenceDate,
    };

    const buildingId = `bldg-${propId}-1`;
    const newBuilding: Building = {
      id: buildingId,
      propertyId: propId,
      name: 'Main Tower',
      code: `${newProperty.code}-B1`,
      floorsCount: Math.max(1, newProperty.floorsCount),
    };

    const newFloors: Floor[] = [];
    for (let f = 1; f <= Math.max(1, newProperty.floorsCount); f++) {
      newFloors.push({
        id: `flr-${buildingId}-${f}`,
        propertyId: propId,
        buildingId,
        floorNumber: f,
        label: `Floor ${f}`,
      });
    }

    const updated: EstaviaDataset = {
      ...dataset,
      properties: [newProperty, ...dataset.properties],
      buildings: [...dataset.buildings, newBuilding],
      floors: [...dataset.floors, ...newFloors],
      activities: appendActivity(dataset, {
        type: 'Property Created',
        title: `Property Created — ${newProperty.name}`,
        description: `Added ${newProperty.type} in ${newProperty.city}, ${newProperty.state}.`,
        propertyId: newProperty.id,
        actor: 'Alexander Mercer',
      }),
    };

    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Property Added', `${newProperty.name} has been added to your portfolio.`);
    return { ok: true, property: newProperty };
  },

  updateProperty: (id, updates) => {
    const { dataset } = get();
    const exists = dataset.properties.find((p) => p.id === id);
    if (!exists) return { ok: false, error: 'Property not found.' };

    const updated: EstaviaDataset = {
      ...dataset,
      properties: dataset.properties.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      activities: appendActivity(dataset, {
        type: 'Property Updated',
        title: `Property Updated — ${updates.name || exists.name}`,
        description: 'Updated property configuration and management metadata.',
        propertyId: id,
        actor: 'Alexander Mercer',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Property Updated', `${updates.name || exists.name} saved.`);
    return { ok: true };
  },

  archiveProperty: (id) => {
    // Preserves all historical leases and transactions!
    const { dataset } = get();
    const target = dataset.properties.find((p) => p.id === id);
    const updated: EstaviaDataset = {
      ...dataset,
      properties: dataset.properties.map((p) =>
        p.id === id ? { ...p, status: 'Archived', archived: true } : p
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast(
      'Property Archived',
      `${target?.name || 'Property'} archived. All historical leases and transactions are preserved.`,
      'warning'
    );
    return { ok: true };
  },

  duplicateProperty: (id) => {
    const { dataset } = get();
    const orig = dataset.properties.find((p) => p.id === id);
    if (!orig) return { ok: false };
    return get().addProperty({
      ...orig,
      name: `${orig.name} (Copy)`,
      code: `${orig.code}-CPY`,
      status: 'Active',
      archived: false,
    });
  },

  addUnit: (input) => {
    const { dataset } = get();
    const property = dataset.properties.find((p) => p.id === input.propertyId);
    if (!property) {
      return { ok: false, error: 'Property does not exist.' };
    }

    let building = dataset.buildings.find(
      (b) => b.id === input.buildingId && b.propertyId === input.propertyId
    );
    if (!building) {
      building = dataset.buildings.find((b) => b.propertyId === input.propertyId);
    }

    const buildingId = building?.id || `bldg-${input.propertyId}-1`;

    // Prevent duplicate unit numbers within the same property and building scope
    const duplicate = dataset.units.find(
      (u) =>
        !u.archived &&
        u.propertyId === input.propertyId &&
        u.buildingId === buildingId &&
        u.unitNumber.trim().toLowerCase() === input.unitNumber.trim().toLowerCase()
    );
    if (duplicate) {
      return {
        ok: false,
        error: `Unit ${input.unitNumber} already exists in this property and building.`,
      };
    }

    let floor = dataset.floors.find(
      (f) => f.buildingId === buildingId && f.floorNumber === input.floorNumber
    );
    const newFloors = [...dataset.floors];
    if (!floor) {
      floor = {
        id: `flr-${buildingId}-${input.floorNumber}`,
        propertyId: input.propertyId,
        buildingId,
        floorNumber: input.floorNumber,
        label: `Floor ${input.floorNumber}`,
      };
      newFloors.push(floor);
    }

    const newUnit: Unit = {
      ...input,
      id: `unit-${dataset.units.length + 1}-${Date.now().toString().slice(-3)}`,
      buildingId,
      floorId: floor.id,
      unitNumber: input.unitNumber.trim(),
    };

    const updated: EstaviaDataset = {
      ...dataset,
      floors: newFloors,
      units: [newUnit, ...dataset.units],
      activities: appendActivity(dataset, {
        type: 'Unit Added',
        title: `Unit ${newUnit.unitNumber} Added to ${property.name}`,
        description: `${newUnit.type} (${newUnit.sqFt} sq ft) configured at $${newUnit.askingRent}/mo.`,
        propertyId: property.id,
        unitId: newUnit.id,
        actor: 'Alexander Mercer',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Unit Added', `Unit ${newUnit.unitNumber} added to ${property.name}.`);
    return { ok: true, unit: newUnit };
  },

  updateUnit: (id, updates) => {
    const { dataset } = get();
    const target = dataset.units.find((u) => u.id === id);
    if (!target) return { ok: false, error: 'Unit not found.' };

    const nextUnitNumber = (updates.unitNumber ?? target.unitNumber).trim();
    const nextPropertyId = updates.propertyId ?? target.propertyId;
    const nextBuildingId = updates.buildingId ?? target.buildingId;

    const duplicate = dataset.units.find(
      (u) =>
        u.id !== id &&
        !u.archived &&
        u.propertyId === nextPropertyId &&
        u.buildingId === nextBuildingId &&
        u.unitNumber.toLowerCase() === nextUnitNumber.toLowerCase()
    );
    if (duplicate) {
      return {
        ok: false,
        error: `Unit ${nextUnitNumber} already exists in this property and building.`,
      };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      units: dataset.units.map((u) =>
        u.id === id ? { ...u, ...updates, unitNumber: nextUnitNumber } : u
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Unit Updated', `Unit ${nextUnitNumber} saved.`);
    return { ok: true };
  },

  archiveUnit: (id) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      units: dataset.units.map((u) =>
        u.id === id ? { ...u, archived: true } : u
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Unit Archived', 'Unit archived from active inventory.', 'warning');
    return { ok: true };
  },

  addTenant: (input) => {
    const { dataset } = get();
    const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    if (!fullName) {
      return { ok: false, error: 'Tenant first and last name are required.' };
    }
    const seq = 1001 + dataset.tenants.length;
    const newTenant: Tenant = {
      ...input,
      id: `ten-${seq}-${Date.now().toString().slice(-3)}`,
      code: `TEN-${seq}`,
      fullName,
      createdAt: dataset.referenceDate,
    };

    const updated: EstaviaDataset = {
      ...dataset,
      tenants: [newTenant, ...dataset.tenants],
      activities: appendActivity(dataset, {
        type: 'Tenant Created',
        title: `Tenant Profile Created — ${newTenant.fullName}`,
        description: `Registered fictional tenant record (${newTenant.code}).`,
        tenantId: newTenant.id,
        actor: 'Nadia Lindqvist',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Tenant Registered', `${newTenant.fullName} (${newTenant.code}) added.`);
    return { ok: true, tenant: newTenant };
  },

  updateTenant: (id, updates) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      tenants: dataset.tenants.map((t) => {
        if (t.id !== id) return t;
        const firstName = updates.firstName ?? t.firstName;
        const lastName = updates.lastName ?? t.lastName;
        return {
          ...t,
          ...updates,
          firstName,
          lastName,
          fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        };
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Tenant Updated', 'Tenant profile changes saved.');
    return { ok: true };
  },

  archiveTenant: (id) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      tenants: dataset.tenants.map((t) =>
        t.id === id ? { ...t, archived: true } : t
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Tenant Archived', 'Tenant archived while preserving lease history.', 'warning');
    return { ok: true };
  },

  addApplication: (input) => {
    const { dataset } = get();
    const seq = 801 + dataset.applications.length;
    const newApp: RentalApplication = {
      ...input,
      id: `app-${seq}-${Date.now().toString().slice(-3)}`,
      code: `APP-${seq}`,
    };
    const updated: EstaviaDataset = {
      ...dataset,
      applications: [newApp, ...dataset.applications],
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Application Created', `Application ${newApp.code} for ${newApp.applicantName} logged.`);
    return { ok: true, application: newApp };
  },

  updateApplicationStatus: (id, status, notes) => {
    const { dataset } = get();
    const target = dataset.applications.find((a) => a.id === id);
    if (!target) return { ok: false, error: 'Application not found.' };
    if (target.status === 'Converted' && status !== 'Converted') {
      return { ok: false, error: 'Converted applications cannot be reverted.' };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      applications: dataset.applications.map((a) =>
        a.id === id ? { ...a, status, notes: notes ?? a.notes } : a
      ),
      activities: appendActivity(dataset, {
        type: 'Application Reviewed',
        title: `Application ${target.code} Marked ${status}`,
        description: `Applicant: ${target.applicantName}.`,
        propertyId: target.propertyId,
        unitId: target.unitId,
        actor: 'Nadia Lindqvist',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Application Updated', `${target.code} status set to ${status}.`);
    return { ok: true };
  },

  convertApplicationToLease: (applicationId, leaseDates) => {
    const { dataset } = get();
    const app = dataset.applications.find((a) => a.id === applicationId);
    if (!app) return { ok: false, errors: ['Application not found.'] };

    if (app.status === 'Converted' || app.convertedLeaseId) {
      return {
        ok: false,
        errors: [`Application ${app.code} has already been converted.`],
      };
    }
    if (app.status !== 'Approved') {
      return {
        ok: false,
        errors: ['Only Approved applications can be converted to a tenant and lease.'],
      };
    }

    const nameParts = app.applicantName.trim().split(' ');
    const firstName = nameParts[0] || 'Applicant';
    const lastName = nameParts.slice(1).join(' ') || 'Resident';

    const tenantSeq = 1001 + dataset.tenants.length;
    const newTenant: Tenant = {
      id: `ten-conv-${tenantSeq}`,
      code: `TEN-${tenantSeq}`,
      firstName,
      lastName,
      fullName: app.applicantName.trim(),
      email: app.applicantEmail,
      phone: app.applicantPhone,
      emergencyContactName: `${lastName} Family Contact`,
      emergencyContactPhone: '+1 (212) 555-0199',
      occupation: app.employmentSummary,
      employer: app.employmentSummary,
      moveInDate: leaseDates.startDate,
      notes: `Converted from Rental Application ${app.code}.`,
      createdAt: dataset.referenceDate,
    };

    const tempDataset: EstaviaDataset = {
      ...dataset,
      tenants: [newTenant, ...dataset.tenants],
    };

    const leaseStatus: LeaseStatus =
      leaseDates.startDate <= dataset.referenceDate ? 'Active' : 'Scheduled';

    const candidateLease: Omit<Lease, 'id' | 'code' | 'createdAt'> = {
      propertyId: app.propertyId,
      unitId: app.unitId,
      tenantId: newTenant.id,
      startDate: leaseDates.startDate,
      endDate: leaseDates.endDate,
      monthlyRent: app.proposedRent,
      securityDeposit: leaseDates.securityDeposit,
      paymentDueDay: get().settings.defaultRentDueDay,
      billingFrequency: 'Monthly',
      status: leaseStatus,
      lateFeeRuleEnabled: true,
      notes: `Created via conversion of Application ${app.code}.`,
    };

    const validation = validateLease(candidateLease, tempDataset);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const leaseSeq = 101 + dataset.leases.length;
    const newLease: Lease = {
      ...candidateLease,
      id: `lease-conv-${leaseSeq}`,
      code: `LSE-${leaseSeq}`,
      createdAt: dataset.referenceDate,
    };

    const updated: EstaviaDataset = {
      ...tempDataset,
      leases: [newLease, ...dataset.leases],
      applications: dataset.applications.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: 'Converted',
              convertedTenantId: newTenant.id,
              convertedLeaseId: newLease.id,
            }
          : a
      ),
      activities: appendActivity(dataset, {
        type: 'Lease Created',
        title: `Application ${app.code} Converted to Lease ${newLease.code}`,
        description: `Assigned ${newTenant.fullName} to unit with term [${newLease.startDate}, ${newLease.endDate}).`,
        propertyId: newLease.propertyId,
        unitId: newLease.unitId,
        tenantId: newTenant.id,
        leaseId: newLease.id,
        actor: 'Nadia Lindqvist',
      }),
    };

    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast(
      'Application Converted',
      `Created ${newTenant.code} and ${newLease.code}.`
    );
    return { ok: true, errors: [], lease: newLease, tenant: newTenant };
  },

  createLease: (input) => {
    const { dataset } = get();
    const validation = validateLease(input, dataset);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const seq = 101 + dataset.leases.length;
    const newLease: Lease = {
      ...input,
      id: `lease-${seq}-${Date.now().toString().slice(-3)}`,
      code: `LSE-${seq}`,
      createdAt: dataset.referenceDate,
    };

    const updated: EstaviaDataset = {
      ...dataset,
      leases: [newLease, ...dataset.leases],
      activities: appendActivity(dataset, {
        type: newLease.status === 'Active' ? 'Lease Activated' : 'Lease Created',
        title: `Lease ${newLease.code} (${newLease.status}) Created`,
        description: `Term [${newLease.startDate}, ${newLease.endDate}) at $${newLease.monthlyRent}/mo.`,
        propertyId: newLease.propertyId,
        unitId: newLease.unitId,
        tenantId: newLease.tenantId,
        leaseId: newLease.id,
        actor: 'Nadia Lindqvist',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Lease Created', `Lease ${newLease.code} saved (${newLease.status}).`);
    return { ok: true, errors: [], lease: newLease };
  },

  updateLease: (id, updates) => {
    const { dataset } = get();
    const existing = dataset.leases.find((l) => l.id === id);
    if (!existing) return { ok: false, errors: ['Lease not found.'] };

    const merged: Lease = { ...existing, ...updates };
    const validation = validateLease(merged, dataset, existing);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      leases: dataset.leases.map((l) => (l.id === id ? merged : l)),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Lease Updated', `Lease ${existing.code} updated.`);
    return { ok: true, errors: [] };
  },

  changeLeaseStatus: (id, newStatus, meta) => {
    const { dataset } = get();
    const existing = dataset.leases.find((l) => l.id === id);
    if (!existing) return { ok: false, errors: ['Lease not found.'] };

    const candidate: Lease = {
      ...existing,
      status: newStatus,
      terminationDate: meta?.terminationDate ?? existing.terminationDate,
      terminationReason: meta?.terminationReason ?? existing.terminationReason,
    };

    const validation = validateLease(candidate, dataset, existing);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      leases: dataset.leases.map((l) => (l.id === id ? candidate : l)),
      activities: appendActivity(dataset, {
        type:
          newStatus === 'Active'
            ? 'Lease Activated'
            : newStatus === 'Terminated'
            ? 'Lease Terminated'
            : 'Lease Created',
        title: `Lease ${existing.code} Status Changed to ${newStatus}`,
        description: meta?.terminationReason || `Transitioned from ${existing.status} to ${newStatus}.`,
        propertyId: existing.propertyId,
        unitId: existing.unitId,
        tenantId: existing.tenantId,
        leaseId: existing.id,
        actor: 'Nadia Lindqvist',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Lease Status Updated', `${existing.code} is now ${newStatus}.`);
    return { ok: true, errors: [] };
  },

  renewLease: (input) => {
    const { dataset } = get();
    const result = createLeaseRenewalRecord(input, dataset);
    if (!result.valid || !result.newLease || !result.renewalRecord || !result.updatedOriginalLease) {
      return { ok: false, errors: result.errors };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      leases: [
        result.newLease,
        ...dataset.leases.map((l) =>
          l.id === result.updatedOriginalLease!.id ? result.updatedOriginalLease! : l
        ),
      ],
      leaseRenewals: [result.renewalRecord, ...dataset.leaseRenewals],
      activities: appendActivity(dataset, {
        type: 'Lease Renewed',
        title: `Lease Renewed — New Term ${result.newLease.code}`,
        description: `Renewed from $${result.renewalRecord.previousRent} to $${result.renewalRecord.newRent}/mo ([${result.newLease.startDate}, ${result.newLease.endDate})).`,
        propertyId: result.newLease.propertyId,
        unitId: result.newLease.unitId,
        tenantId: result.newLease.tenantId,
        leaseId: result.newLease.id,
        actor: 'Nadia Lindqvist',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast(
      'Lease Renewed',
      `Created renewal lease ${result.newLease.code} while preserving original lease history.`
    );
    return { ok: true, errors: [], newLease: result.newLease };
  },

  generateMonthlyRent: (billingPeriod) => {
    const { dataset } = get();
    const { createdCharges, skippedCount } = generateMonthlyRentCharges(
      dataset.leases,
      dataset.rentCharges,
      billingPeriod,
      dataset.referenceDate
    );

    if (createdCharges.length === 0) {
      get().showToast(
        'Rent Roll Up to Date',
        `All ${skippedCount} eligible leases already have rent charges for ${billingPeriod}. Zero duplicates created.`,
        'warning'
      );
      return { createdCount: 0, skippedCount };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      rentCharges: [...createdCharges, ...dataset.rentCharges],
      activities: appendActivity(dataset, {
        type: 'Rent Charged',
        title: `Generated ${createdCharges.length} Monthly Rent Charges for ${billingPeriod}`,
        description: `Skipped ${skippedCount} existing lease charges via idempotency check.`,
        actor: 'Alexander Mercer',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast(
      'Rent Charges Generated',
      `Created ${createdCharges.length} new rent invoices for ${billingPeriod} (${skippedCount} duplicates skipped).`
    );
    return { createdCount: createdCharges.length, skippedCount };
  },

  recordRentPayment: (params) => {
    const { dataset } = get();
    const charge = dataset.rentCharges.find((c) => c.id === params.rentChargeId);
    if (!charge) return { ok: false, error: 'Rent charge not found.' };

    const res = recordPaymentAgainstCharge(
      charge,
      params.amount,
      params.type,
      params.method,
      params.date,
      params.reference,
      params.notes,
      dataset.referenceDate,
      dataset.rentPayments.length
    );

    if (!res.valid || !res.updatedCharge || !res.paymentRecord || !res.allocationRecord) {
      return { ok: false, error: res.error };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      rentCharges: dataset.rentCharges.map((c) =>
        c.id === charge.id ? res.updatedCharge! : c
      ),
      rentPayments: [res.paymentRecord, ...dataset.rentPayments],
      paymentAllocations: [res.allocationRecord, ...dataset.paymentAllocations],
      activities: appendActivity(dataset, {
        type: 'Payment Recorded',
        title: `${params.type} Recorded (${res.paymentRecord.code}) — $${params.amount.toFixed(2)}`,
        description: `Applied to invoice ${charge.code} (${charge.billingPeriod}). Remaining balance: $${res.updatedCharge.balance.toFixed(2)}.`,
        propertyId: charge.propertyId,
        unitId: charge.unitId,
        tenantId: charge.tenantId,
        leaseId: charge.leaseId,
        actor: 'Alexander Mercer',
      }),
    };

    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast(
      `${params.type} Recorded`,
      `$${params.amount.toFixed(2)} applied to ${charge.code}. New status: ${res.updatedCharge.status}.`
    );
    return { ok: true };
  },

  reversePayment: (paymentId, reason) => {
    const { dataset } = get();
    const payment = dataset.rentPayments.find((p) => p.id === paymentId);
    if (!payment) return { ok: false, error: 'Payment not found.' };

    const charge = dataset.rentCharges.find((c) => c.id === payment.rentChargeId);
    if (!charge) return { ok: false, error: 'Associated rent charge not found.' };

    const res = reverseRentPayment(
      payment,
      charge,
      dataset.referenceDate,
      dataset.rentPayments.length,
      reason
    );

    if (!res.valid || !res.updatedOriginalPayment || !res.reversalPayment || !res.updatedCharge) {
      return { ok: false, error: res.error };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      rentCharges: dataset.rentCharges.map((c) =>
        c.id === charge.id ? res.updatedCharge! : c
      ),
      rentPayments: [
        res.reversalPayment,
        ...dataset.rentPayments.map((p) =>
          p.id === payment.id ? res.updatedOriginalPayment! : p
        ),
      ],
      paymentAllocations: dataset.paymentAllocations.filter(
        (a) => a.paymentId !== payment.id
      ),
      activities: appendActivity(dataset, {
        type: 'Payment Reversed',
        title: `Payment ${payment.code} Reversed (${res.reversalPayment.code})`,
        description: `Reversed $${payment.amount.toFixed(2)} on invoice ${charge.code}. Reason: ${reason || 'Operator adjustment'}.`,
        propertyId: charge.propertyId,
        unitId: charge.unitId,
        tenantId: charge.tenantId,
        leaseId: charge.leaseId,
        actor: 'Alexander Mercer',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast(
      'Payment Reversed',
      `${payment.code} reversed. Invoice ${charge.code} balance updated to $${res.updatedCharge.balance.toFixed(2)}.`,
      'warning'
    );
    return { ok: true };
  },

  recordDepositTransaction: (input) => {
    const { dataset } = get();
    const seq = 7001 + dataset.depositTransactions.length;
    const newTx: SecurityDepositTransaction = {
      ...input,
      id: `dep-${seq}-${Date.now().toString().slice(-3)}`,
      code: `DEP-${seq}`,
    };

    const updated: EstaviaDataset = {
      ...dataset,
      depositTransactions: [newTx, ...dataset.depositTransactions],
      activities: appendActivity(dataset, {
        type: input.type === 'Return' ? 'Deposit Returned' : 'Deposit Recorded',
        title: `Security Deposit ${input.type} (${newTx.code}) — $${input.amount.toFixed(2)}`,
        description: input.notes || `Recorded security deposit ${input.type.toLowerCase()}.`,
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantId: input.tenantId,
        leaseId: input.leaseId,
        actor: 'Alexander Mercer',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Deposit Ledger Updated', `Recorded ${newTx.code} ($${input.amount.toFixed(2)}).`);
    return { ok: true, transaction: newTx };
  },

  addExpense: (input) => {
    const { dataset } = get();
    const seq = 3001 + dataset.expenses.length;
    const newExp: PropertyExpense = {
      ...input,
      id: `exp-${seq}-${Date.now().toString().slice(-3)}`,
      code: `EXP-${seq}`,
    };

    const updated: EstaviaDataset = {
      ...dataset,
      expenses: [newExp, ...dataset.expenses],
      activities: appendActivity(dataset, {
        type: 'Expense Recorded',
        title: `Operating Expense Logged (${newExp.code}) — $${newExp.amount.toFixed(2)}`,
        description: `${newExp.category}: ${newExp.description}`,
        propertyId: newExp.propertyId,
        unitId: newExp.unitId,
        actor: 'Alexander Mercer',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Expense Recorded', `${newExp.code} ($${newExp.amount.toFixed(2)}) added.`);
    return { ok: true, expense: newExp };
  },

  updateExpense: (id, updates) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      expenses: dataset.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Expense Updated', 'Expense record updated.');
    return { ok: true };
  },

  archiveExpense: (id) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      expenses: dataset.expenses.map((e) =>
        e.id === id ? { ...e, archived: true, status: 'Archived' } : e
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Expense Archived', 'Expense archived from active ledger.', 'warning');
    return { ok: true };
  },

  addMaintenanceRequest: (input) => {
    const { dataset } = get();
    const prop = dataset.properties.find((p) => p.id === input.propertyId);
    const unit = dataset.units.find((u) => u.id === input.unitId);
    if (!prop || !unit) {
      return { ok: false, error: 'Maintenance work order must reference a valid property and unit.' };
    }

    const seq = 4001 + dataset.maintenanceRequests.length;
    const reqId = `maint-${seq}-${Date.now().toString().slice(-3)}`;
    const newReq: MaintenanceRequest = {
      ...input,
      id: reqId,
      code: `WO-${seq}`,
      actualCost: input.actualCost ?? 0,
      comments: [
        {
          id: `cmt-${reqId}-1`,
          requestId: reqId,
          authorName: 'Lauren Vance',
          authorRole: 'Maintenance Coordinator',
          createdAt: dataset.referenceDate,
          content: 'Work order created and queued for triage.',
        },
      ],
    };

    const updated: EstaviaDataset = {
      ...dataset,
      maintenanceRequests: [newReq, ...dataset.maintenanceRequests],
      activities: appendActivity(dataset, {
        type: 'Maintenance Created',
        title: `Work Order ${newReq.code} Created — ${newReq.title}`,
        description: `${newReq.priority} priority (${newReq.category}) at ${prop.name} Unit ${unit.unitNumber}.`,
        propertyId: newReq.propertyId,
        unitId: newReq.unitId,
        tenantId: newReq.tenantId,
        actor: 'Lauren Vance',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Work Order Created', `${newReq.code}: ${newReq.title}`);
    return { ok: true, request: newReq };
  },

  updateMaintenanceRequest: (id, updates) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      maintenanceRequests: dataset.maintenanceRequests.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Work Order Updated', 'Maintenance changes saved.');
    return { ok: true };
  },

  moveMaintenanceStage: (id, stage) => {
    const { dataset } = get();
    const target = dataset.maintenanceRequests.find((m) => m.id === id);
    if (!target) return { ok: false, error: 'Work order not found.' };

    const res = transitionMaintenanceStage(target, stage, dataset.referenceDate);
    if (!res.valid || !res.updatedRequest) {
      get().showToast('Invalid Stage Transition', res.error, 'danger');
      return { ok: false, error: res.error };
    }

    const updated: EstaviaDataset = {
      ...dataset,
      maintenanceRequests: dataset.maintenanceRequests.map((m) =>
        m.id === id ? res.updatedRequest! : m
      ),
      activities: appendActivity(dataset, {
        type: stage === 'Closed' ? 'Maintenance Closed' : 'Maintenance Assigned',
        title: `Work Order ${target.code} Moved to ${stage}`,
        description: target.title,
        propertyId: target.propertyId,
        unitId: target.unitId,
        actor: 'Lauren Vance',
      }),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Stage Updated', `${target.code} moved to ${stage}.`);
    return { ok: true };
  },

  addMaintenanceComment: (requestId, content, authorName = 'Lauren Vance') => {
    const { dataset } = get();
    if (!content.trim()) return { ok: false };
    const comment: MaintenanceComment = {
      id: `cmt-${requestId}-${Date.now()}`,
      requestId,
      authorName,
      authorRole: 'Operations Team',
      createdAt: dataset.referenceDate,
      content: content.trim(),
    };

    const updated: EstaviaDataset = {
      ...dataset,
      maintenanceRequests: dataset.maintenanceRequests.map((m) =>
        m.id === requestId ? { ...m, comments: [...m.comments, comment] } : m
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    return { ok: true };
  },

  recordMaintenanceCost: (requestId, actualCost) => {
    const { dataset } = get();
    const target = dataset.maintenanceRequests.find((m) => m.id === requestId);
    if (!target) return { ok: false };

    const sync = syncMaintenanceActualCostToExpense(
      target,
      actualCost,
      dataset.expenses,
      dataset.referenceDate
    );

    let nextExpenses = [...dataset.expenses];
    if (sync.newExpense) {
      nextExpenses = [sync.newExpense, ...nextExpenses];
    } else if (sync.updatedExpense) {
      nextExpenses = nextExpenses.map((e) =>
        e.id === sync.updatedExpense!.id ? sync.updatedExpense! : e
      );
    }

    const updated: EstaviaDataset = {
      ...dataset,
      maintenanceRequests: dataset.maintenanceRequests.map((m) =>
        m.id === requestId ? sync.updatedRequest : m
      ),
      expenses: nextExpenses,
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast(
      'Maintenance Cost Synced',
      `Recorded $${actualCost.toFixed(2)} actual cost and linked single expense record.`
    );
    return { ok: true };
  },

  addVendor: (input) => {
    const { dataset } = get();
    const seq = 201 + dataset.vendors.length;
    const newVendor: Vendor = {
      ...input,
      id: `ven-${seq}-${Date.now().toString().slice(-3)}`,
      code: `VEN-${seq}`,
    };
    const updated: EstaviaDataset = {
      ...dataset,
      vendors: [newVendor, ...dataset.vendors],
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Vendor Added', `${newVendor.businessName} added to directory.`);
    return { ok: true, vendor: newVendor };
  },

  updateVendor: (id, updates) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      vendors: dataset.vendors.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Vendor Updated', 'Vendor details updated.');
    return { ok: true };
  },

  archiveVendor: (id) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      vendors: dataset.vendors.map((v) =>
        v.id === id ? { ...v, archived: true } : v
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Vendor Archived', 'Vendor archived from active directory.', 'warning');
    return { ok: true };
  },

  addInspection: (input) => {
    const { dataset } = get();
    const seq = 901 + dataset.inspections.length;
    const newInsp: Inspection = {
      ...input,
      id: `insp-${seq}-${Date.now().toString().slice(-3)}`,
      code: `INSP-${seq}`,
    };
    const updated: EstaviaDataset = {
      ...dataset,
      inspections: [newInsp, ...dataset.inspections],
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Inspection Created', `${newInsp.code} (${newInsp.type}) scheduled.`);
    return { ok: true, inspection: newInsp };
  },

  updateInspection: (id, updates) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      inspections: dataset.inspections.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Inspection Updated', 'Inspection checklist saved.');
    return { ok: true };
  },

  saveReportConfig: (input) => {
    const { dataset } = get();
    const newRep: SavedReport = {
      ...input,
      id: `rep-${Date.now()}`,
      createdAt: dataset.referenceDate,
    };
    const updated: EstaviaDataset = {
      ...dataset,
      savedReports: [newRep, ...dataset.savedReports],
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
    get().showToast('Report Configuration Saved', `${newRep.name} added to saved presets.`);
    return { ok: true };
  },

  deleteSavedReport: (id) => {
    const { dataset } = get();
    const updated: EstaviaDataset = {
      ...dataset,
      savedReports: dataset.savedReports.filter((r) => r.id !== id),
    };
    saveDatasetToStorage(updated);
    set({ dataset: updated });
  },

  updateSettings: (updates) => {
    const next = { ...get().settings, ...updates };
    saveSettingsToStorage(next);
    set({ settings: next });
    get().showToast('Settings Saved', 'Workspace configuration updated.');
  },

  restoreFromBackupJson: (rawJson) => {
    const res = parseAndValidateBackupJson(rawJson);
    if (!res.valid || !res.dataset) {
      return { ok: false, errors: res.errors };
    }
    saveDatasetToStorage(res.dataset);
    if (res.settings) {
      saveSettingsToStorage(res.settings);
    }
    set({
      dataset: res.dataset,
      settings: res.settings ?? get().settings,
    });
    get().showToast('Backup Restored', 'Validated JSON backup restored to LocalStorage.');
    return { ok: true, errors: [] };
  },

  resetDemoWorkspace: () => {
    const fresh = generateDeterministicDemoDataset();
    saveDatasetToStorage(fresh);
    saveSettingsToStorage(DEFAULT_WORKSPACE_SETTINGS);
    set({
      dataset: fresh,
      settings: DEFAULT_WORKSPACE_SETTINGS,
      selectedPropertyId: 'all',
      selectedPeriod: '2026-11',
    });
    get().showToast('Demo Data Reset', 'Restored deterministic ESTAVIA demo dataset.');
  },
}));
