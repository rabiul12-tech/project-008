import Decimal from 'decimal.js';
import {
  DerivedOccupancyStatus,
  Lease,
  Unit,
} from '../types';

/**
 * Computes unit occupancy status strictly from effective leases and unit availability rules.
 * - An Active Lease counts as Occupied ONLY when startDate <= referenceDate < effectiveEndDate.
 * - A future Scheduled Lease does NOT count as a current occupant (if the unit has a future scheduled lease or reservation, it shows as Reserved if not currently occupied).
 * - Units marked Unavailable or Under Maintenance without an active lease return that status.
 */
export function deriveUnitOccupancyStatus(
  unit: Unit,
  leases: Lease[],
  referenceDate: string
): {
  status: DerivedOccupancyStatus;
  activeLease?: Lease;
  scheduledLease?: Lease;
} {
  const unitLeases = leases.filter((l) => l.unitId === unit.id);

  const activeLease = unitLeases.find((l) => {
    if (l.status !== 'Active') return false;
    const effectiveEnd =
      l.terminationDate && l.terminationDate < l.endDate
        ? l.terminationDate
        : l.endDate;
    return l.startDate <= referenceDate && referenceDate < effectiveEnd;
  });

  if (activeLease) {
    return { status: 'Occupied', activeLease };
  }

  if (unit.availabilityMode === 'Under Maintenance') {
    return { status: 'Under Maintenance' };
  }

  if (unit.availabilityMode === 'Unavailable') {
    return { status: 'Unavailable' };
  }

  const scheduledLease = unitLeases.find(
    (l) =>
      (l.status === 'Scheduled' || l.status === 'Active') &&
      l.startDate > referenceDate
  );

  if (unit.availabilityMode === 'Reserved' || scheduledLease) {
    return { status: 'Reserved', scheduledLease };
  }

  return { status: 'Vacant' };
}

export interface OccupancySummary {
  totalUnits: number;
  totalEligibleLeasableUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  reservedUnits: number;
  unavailableUnits: number;
  underMaintenanceUnits: number;
  occupancyRate: number; // Occupied Leasable Units / Total Eligible Leasable Units * 100
  vacancyRate: number;   // (Vacant + Reserved) / Total Eligible Leasable Units * 100
}

/**
 * Calculates occupancy summary across a set of units.
 * Formula:
 * - Eligible Leasable Units = Total Non-Archived Units minus Unavailable & Under Maintenance units.
 * - Occupancy Rate = (Occupied Units / Total Eligible Leasable Units) * 100
 * - Handles zero denominators safely.
 */
export function calculateOccupancySummary(
  units: Unit[],
  leases: Lease[],
  referenceDate: string
): OccupancySummary {
  const activeUnits = units.filter((u) => !u.archived);
  let occupiedUnits = 0;
  let vacantUnits = 0;
  let reservedUnits = 0;
  let unavailableUnits = 0;
  let underMaintenanceUnits = 0;

  for (const unit of activeUnits) {
    const derived = deriveUnitOccupancyStatus(unit, leases, referenceDate);
    switch (derived.status) {
      case 'Occupied':
        occupiedUnits++;
        break;
      case 'Vacant':
        vacantUnits++;
        break;
      case 'Reserved':
        reservedUnits++;
        break;
      case 'Unavailable':
        unavailableUnits++;
        break;
      case 'Under Maintenance':
        underMaintenanceUnits++;
        break;
    }
  }

  const totalUnits = activeUnits.length;
  const totalEligibleLeasableUnits =
    totalUnits - unavailableUnits - underMaintenanceUnits;

  if (totalEligibleLeasableUnits <= 0) {
    return {
      totalUnits,
      totalEligibleLeasableUnits: 0,
      occupiedUnits,
      vacantUnits,
      reservedUnits,
      unavailableUnits,
      underMaintenanceUnits,
      occupancyRate: 0,
      vacancyRate: 0,
    };
  }

  const occRate = new Decimal(occupiedUnits)
    .div(totalEligibleLeasableUnits)
    .mul(100)
    .toDecimalPlaces(1)
    .toNumber();

  const vacRate = new Decimal(totalEligibleLeasableUnits - occupiedUnits)
    .div(totalEligibleLeasableUnits)
    .mul(100)
    .toDecimalPlaces(1)
    .toNumber();

  return {
    totalUnits,
    totalEligibleLeasableUnits,
    occupiedUnits,
    vacantUnits,
    reservedUnits,
    unavailableUnits,
    underMaintenanceUnits,
    occupancyRate: occRate,
    vacancyRate: vacRate,
  };
}
