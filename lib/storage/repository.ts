import { z } from 'zod';
import { EstaviaDataset, WorkspaceSettings } from '../types';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  generateDeterministicDemoDataset,
} from '../seed/demo-seed';

export const STORAGE_KEYS = {
  VERSION: 'estavia:version',
  DATA: 'estavia:data',
  SETTINGS: 'estavia:settings',
  UI: 'estavia:ui',
} as const;

export const CURRENT_SCHEMA_VERSION = 1;

export const WorkspaceSettingsSchema = z.object({
  companyName: z.string().min(1),
  portfolioName: z.string().min(1),
  companyEmail: z.string().min(1),
  companyPhone: z.string().min(1),
  companyAddress: z.string().min(1),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD']),
  dateFormat: z.enum(['MMM d, yyyy', 'yyyy-MM-dd', 'dd/MM/yyyy']),
  timezone: z.string(),
  defaultRentDueDay: z.number().min(1).max(28),
  defaultLeaseTermMonths: z.number().min(1).max(120),
  lateFeeEnabled: z.boolean(),
  lateFeeGraceDays: z.number().min(0).max(30),
  lateFeeFlatAmount: z.number().min(0),
  prorationMethod: z.enum(['ActualDaysInMonth', 'Standard30Day']),
  defaultMaintenancePriority: z.enum(['Low', 'Medium', 'High', 'Emergency']),
  notificationsEnabled: z.boolean(),
});

export const EstaviaBackupSchema = z.object({
  version: z.number().int().min(1),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  properties: z.array(z.any()).min(1),
  buildings: z.array(z.any()),
  floors: z.array(z.any()),
  units: z.array(z.any()),
  tenants: z.array(z.any()),
  applications: z.array(z.any()),
  leases: z.array(z.any()),
  leaseRenewals: z.array(z.any()),
  rentCharges: z.array(z.any()),
  rentPayments: z.array(z.any()),
  paymentAllocations: z.array(z.any()),
  depositTransactions: z.array(z.any()),
  expenses: z.array(z.any()),
  maintenanceRequests: z.array(z.any()),
  vendors: z.array(z.any()),
  inspections: z.array(z.any()),
  activities: z.array(z.any()),
  teamMembers: z.array(z.any()),
  savedReports: z.array(z.any()),
});

/**
 * Validates dataset structure and referential integrity.
 */
export function validateDatasetIntegrity(data: unknown): {
  valid: boolean;
  errors: string[];
  dataset?: EstaviaDataset;
} {
  const parsed = EstaviaBackupSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }

  const d = parsed.data as EstaviaDataset;
  const errors: string[] = [];

  const propIds = new Set(d.properties.map((p) => p.id));
  const unitIds = new Set(d.units.map((u) => u.id));
  const tenantIds = new Set(d.tenants.map((t) => t.id));

  for (const unit of d.units) {
    if (!propIds.has(unit.propertyId)) {
      errors.push(`Unit ${unit.id} references missing property ${unit.propertyId}`);
    }
  }

  for (const lease of d.leases) {
    if (!unitIds.has(lease.unitId)) {
      errors.push(`Lease ${lease.id} references missing unit ${lease.unitId}`);
    }
    if (!tenantIds.has(lease.tenantId)) {
      errors.push(`Lease ${lease.id} references missing tenant ${lease.tenantId}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], dataset: d };
}

export function loadDatasetFromStorage(): {
  dataset: EstaviaDataset;
  recoveredFromCorruption: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      dataset: generateDeterministicDemoDataset(),
      recoveredFromCorruption: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.DATA);
    if (!raw) {
      const seed = generateDeterministicDemoDataset();
      saveDatasetToStorage(seed);
      return { dataset: seed, recoveredFromCorruption: false };
    }

    const parsedJson = JSON.parse(raw);
    const check = validateDatasetIntegrity(parsedJson);
    if (!check.valid || !check.dataset) {
      const seed = generateDeterministicDemoDataset();
      saveDatasetToStorage(seed);
      return { dataset: seed, recoveredFromCorruption: true };
    }

    return { dataset: check.dataset, recoveredFromCorruption: false };
  } catch {
    const seed = generateDeterministicDemoDataset();
    saveDatasetToStorage(seed);
    return { dataset: seed, recoveredFromCorruption: true };
  }
}

export function saveDatasetToStorage(dataset: EstaviaDataset): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEYS.VERSION, String(CURRENT_SCHEMA_VERSION));
    window.localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(dataset));
    return true;
  } catch {
    return false;
  }
}

export function loadSettingsFromStorage(): WorkspaceSettings {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettingsToStorage(DEFAULT_WORKSPACE_SETTINGS);
      return DEFAULT_WORKSPACE_SETTINGS;
    }
    const parsed = WorkspaceSettingsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      saveSettingsToStorage(DEFAULT_WORKSPACE_SETTINGS);
      return DEFAULT_WORKSPACE_SETTINGS;
    }
    return parsed.data;
  } catch {
    return DEFAULT_WORKSPACE_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: WorkspaceSettings): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function createBackupJson(
  dataset: EstaviaDataset,
  settings: WorkspaceSettings
): string {
  return JSON.stringify(
    {
      schema: 'estavia-backup-v1',
      exportedAt: new Date().toISOString(),
      version: CURRENT_SCHEMA_VERSION,
      settings,
      dataset,
    },
    null,
    2
  );
}

export function parseAndValidateBackupJson(rawJson: string): {
  valid: boolean;
  errors: string[];
  dataset?: EstaviaDataset;
  settings?: WorkspaceSettings;
} {
  try {
    const parsed = JSON.parse(rawJson);
    const candidateDataset = parsed.dataset ?? parsed;
    const integrity = validateDatasetIntegrity(candidateDataset);
    if (!integrity.valid || !integrity.dataset) {
      return { valid: false, errors: integrity.errors };
    }

    let settings = DEFAULT_WORKSPACE_SETTINGS;
    if (parsed.settings) {
      const sCheck = WorkspaceSettingsSchema.safeParse(parsed.settings);
      if (sCheck.success) {
        settings = sCheck.data;
      }
    }

    return {
      valid: true,
      errors: [],
      dataset: integrity.dataset,
      settings,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [(err as Error).message || 'Invalid JSON format.'],
    };
  }
}
