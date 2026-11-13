import {
  EstaviaDataset,
  Lease,
  LeaseRenewal,
  LeaseStatus,
} from '../types';

export interface LeaseValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Checks whether two half-open date intervals [startA, endA) and [startB, endB) overlap.
 * Formula: startA < endB AND startB < endA
 */
export function doLeaseIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

const VALID_TRANSITIONS: Record<LeaseStatus, LeaseStatus[]> = {
  Draft: ['Scheduled', 'Active', 'Cancelled'],
  Scheduled: ['Active', 'Cancelled'],
  Active: ['Expired', 'Terminated'],
  Expired: [],
  Terminated: [],
  Cancelled: [],
};

export function isValidLeaseStatusTransition(
  fromStatus: LeaseStatus,
  toStatus: LeaseStatus
): boolean {
  if (fromStatus === toStatus) return true;
  return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

/**
 * Validates creating or activating a lease against the dataset.
 */
export function validateLease(
  candidate: Omit<Lease, 'id' | 'code' | 'createdAt'> & { id?: string },
  dataset: Pick<EstaviaDataset, 'tenants' | 'units' | 'properties' | 'leases'>,
  existingLease?: Lease
): LeaseValidationResult {
  const errors: string[] = [];

  // 1. Tenant must exist
  const tenant = dataset.tenants.find((t) => t.id === candidate.tenantId && !t.archived);
  if (!tenant) {
    errors.push('Selected tenant does not exist or is archived.');
  }

  // 2. Unit must exist
  const unit = dataset.units.find((u) => u.id === candidate.unitId && !u.archived);
  if (!unit) {
    errors.push('Selected unit does not exist or is archived.');
  }

  // 3. Property must exist
  const property = dataset.properties.find(
    (p) => p.id === candidate.propertyId && !p.archived
  );
  if (!property) {
    errors.push('Selected property does not exist or is archived.');
  }

  if (unit && property && unit.propertyId !== property.id) {
    errors.push('Selected unit does not belong to the specified property.');
  }

  // 4. Lease start date must be valid
  const startRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!candidate.startDate || !startRegex.test(candidate.startDate) || isNaN(Date.parse(candidate.startDate))) {
    errors.push('Lease start date must be a valid YYYY-MM-DD date.');
  }

  // 5. Lease end date must be later than start date
  if (!candidate.endDate || !startRegex.test(candidate.endDate) || isNaN(Date.parse(candidate.endDate))) {
    errors.push('Lease end date must be a valid YYYY-MM-DD date.');
  } else if (candidate.startDate && candidate.endDate <= candidate.startDate) {
    errors.push('Lease end date must be strictly later than start date (half-open interval [startDate, endDate)).');
  }

  // 6. Rent amount must be non-negative
  if (typeof candidate.monthlyRent !== 'number' || isNaN(candidate.monthlyRent) || candidate.monthlyRent < 0) {
    errors.push('Monthly rent amount must be non-negative.');
  }

  // 7. Security deposit must be valid
  if (typeof candidate.securityDeposit !== 'number' || isNaN(candidate.securityDeposit) || candidate.securityDeposit < 0) {
    errors.push('Security deposit amount must be non-negative.');
  }

  // 8. Unit must be eligible for leasing
  if (unit && (unit.availabilityMode === 'Unavailable' || unit.availabilityMode === 'Under Maintenance')) {
    // Allow if updating an already-active lease on that unit, otherwise block new exclusive activation
    if (!existingLease || existingLease.status === 'Draft') {
      errors.push(`Unit ${unit.unitNumber} is currently marked as ${unit.availabilityMode} and is not eligible for leasing.`);
    }
  }

  // 9. Lease period must not conflict with another exclusive Scheduled or Active Lease
  if (
    candidate.unitId &&
    candidate.startDate &&
    candidate.endDate &&
    candidate.endDate > candidate.startDate &&
    (candidate.status === 'Active' || candidate.status === 'Scheduled' || candidate.status === 'Draft')
  ) {
    const conflictingLease = dataset.leases.find((other) => {
      if (other.id === candidate.id) return false;
      if (other.unitId !== candidate.unitId) return false;
      if (other.status !== 'Active' && other.status !== 'Scheduled') return false;
      const effectiveOtherEnd =
        other.terminationDate && other.terminationDate < other.endDate
          ? other.terminationDate
          : other.endDate;
      return doLeaseIntervalsOverlap(
        candidate.startDate,
        candidate.endDate,
        other.startDate,
        effectiveOtherEnd
      );
    });

    if (conflictingLease) {
      errors.push(
        `Lease period [${candidate.startDate}, ${candidate.endDate}) conflicts with existing ${conflictingLease.status} lease ${conflictingLease.code} ([${conflictingLease.startDate}, ${conflictingLease.endDate})).`
      );
    }
  }

  // 10. Lease status transition must be valid
  if (existingLease && !isValidLeaseStatusTransition(existingLease.status, candidate.status)) {
    errors.push(
      `Invalid lease status transition from ${existingLease.status} to ${candidate.status}.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface RenewLeaseInput {
  originalLeaseId: string;
  newStartDate: string;
  newEndDate: string;
  newMonthlyRent: number;
  newSecurityDeposit?: number;
  notes?: string;
}

export function createLeaseRenewalRecord(
  input: RenewLeaseInput,
  dataset: EstaviaDataset
): {
  valid: boolean;
  errors: string[];
  newLease?: Lease;
  renewalRecord?: LeaseRenewal;
  updatedOriginalLease?: Lease;
} {
  const original = dataset.leases.find((l) => l.id === input.originalLeaseId);
  if (!original) {
    return { valid: false, errors: ['Original lease not found.'] };
  }

  if (original.renewedToLeaseId) {
    return {
      valid: false,
      errors: [`Lease ${original.code} has already been renewed.`],
    };
  }

  if (original.status !== 'Active' && original.status !== 'Expired') {
    return {
      valid: false,
      errors: [`Only Active or Expired leases can be renewed (current status: ${original.status}).`],
    };
  }

  if (input.newStartDate < original.endDate) {
    return {
      valid: false,
      errors: [
        `Renewal start date (${input.newStartDate}) must be on or after the original lease end date (${original.endDate}).`,
      ],
    };
  }

  const newStatus: LeaseStatus =
    input.newStartDate <= dataset.referenceDate ? 'Active' : 'Scheduled';

  const candidate: Omit<Lease, 'id' | 'code' | 'createdAt'> = {
    propertyId: original.propertyId,
    unitId: original.unitId,
    tenantId: original.tenantId,
    startDate: input.newStartDate,
    endDate: input.newEndDate,
    monthlyRent: input.newMonthlyRent,
    securityDeposit: input.newSecurityDeposit ?? original.securityDeposit,
    paymentDueDay: original.paymentDueDay,
    billingFrequency: original.billingFrequency,
    status: newStatus,
    previousLeaseId: original.id,
    lateFeeRuleEnabled: original.lateFeeRuleEnabled,
    notes: input.notes || `Renewal of ${original.code}`,
  };

  const validation = validateLease(candidate, dataset);
  if (!validation.valid) {
    return { valid: false, errors: validation.errors };
  }

  const nextNum = dataset.leases.length + 101;
  const newLeaseId = `lease-ren-${original.id}-${nextNum}`;
  const newLease: Lease = {
    ...candidate,
    id: newLeaseId,
    code: `LSE-${nextNum}`,
    createdAt: dataset.referenceDate,
  };

  const renewalRecord: LeaseRenewal = {
    id: `ren-${original.id}-${nextNum}`,
    originalLeaseId: original.id,
    newLeaseId,
    renewedAt: dataset.referenceDate,
    previousRent: original.monthlyRent,
    newRent: input.newMonthlyRent,
    notes: input.notes || 'Standard term renewal',
  };

  const updatedOriginalLease: Lease = {
    ...original,
    renewedToLeaseId: newLeaseId,
    status: original.endDate <= dataset.referenceDate ? 'Expired' : original.status,
  };

  return {
    valid: true,
    errors: [],
    newLease,
    renewalRecord,
    updatedOriginalLease,
  };
}
