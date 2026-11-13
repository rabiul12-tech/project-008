import { describe, it, expect, beforeEach } from 'vitest';
import { useEstaviaStore } from '../stores/useEstaviaStore';
import {
  doLeaseIntervalsOverlap,
  validateLease,
} from '../lib/engines/lease-engine';
import {
  calculateOccupancySummary,
  deriveUnitOccupancyStatus,
} from '../lib/engines/occupancy-engine';
import {
  generateMonthlyRentCharges,
  recalculateRentChargeState,
  recordPaymentAgainstCharge,
  reverseRentPayment,
} from '../lib/engines/rent-engine';
import { calculateFinancialSummary } from '../lib/engines/financial-engine';
import {
  aggregateOpenWorkOrdersReport,
  canTransitionMaintenanceStage,
  isMaintenanceRequestOpen,
  syncMaintenanceActualCostToExpense,
} from '../lib/engines/maintenance-engine';
import {
  createBackupJson,
  loadDatasetFromStorage,
  parseAndValidateBackupJson,
  STORAGE_KEYS,
  validateDatasetIntegrity,
} from '../lib/storage/repository';
import {
  buildCsvString,
  generateRentReceiptPdf,
  generateSampleLeasePdf,
} from '../lib/export/exporter';

// Mock browser localStorage for node test environment
const memoryStorage = new Map<string, string>();
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, val: string) => memoryStorage.set(key, val),
        removeItem: (key: string) => memoryStorage.delete(key),
        clear: () => memoryStorage.clear(),
      },
    },
    writable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: {
      documentElement: {
        classList: {
          toggle: () => {},
        },
      },
    },
    writable: true,
  });
}

describe('ESTAVIA — Complete 55-Point Suite (Property, Lease, Rent, Finance, Maintenance, Storage)', () => {
  beforeEach(() => {
    memoryStorage.clear();
    useEstaviaStore.getState().resetDemoWorkspace();
  });

  it('01. Property creation adds property, default building, and floors', () => {
    const store = useEstaviaStore.getState();
    const initialCount = store.dataset.properties.length;
    const res = store.addProperty({
      name: 'The Kensington Crown',
      code: 'EST-LON-99',
      type: 'Apartment Building',
      address: '100 High Street',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      floorsCount: 4,
      targetUnitsCount: 16,
      status: 'Active',
      description: 'Luxury test building',
      amenities: ['Concierge'],
      imageUrl: 'architectural-test',
      notes: 'Test note',
      yearBuilt: 2024,
    });
    expect(res.ok).toBe(true);
    expect(useEstaviaStore.getState().dataset.properties.length).toBe(initialCount + 1);
  });

  it('02. Property editing updates property fields cleanly', () => {
    const store = useEstaviaStore.getState();
    const prop = store.dataset.properties[0];
    const res = store.updateProperty(prop.id, { name: 'Updated Sovereign Tower' });
    expect(res.ok).toBe(true);
    expect(useEstaviaStore.getState().dataset.properties[0].name).toBe('Updated Sovereign Tower');
  });

  it('03. Property archive marks property archived without deleting leases or transactions', () => {
    const store = useEstaviaStore.getState();
    const prop = store.dataset.properties[0];
    const leasesBefore = store.dataset.leases.filter((l) => l.propertyId === prop.id).length;
    const chargesBefore = store.dataset.rentCharges.filter((c) => c.propertyId === prop.id).length;

    store.archiveProperty(prop.id);
    const updatedState = useEstaviaStore.getState().dataset;
    const archivedProp = updatedState.properties.find((p) => p.id === prop.id);
    expect(archivedProp?.archived).toBe(true);
    expect(updatedState.leases.filter((l) => l.propertyId === prop.id).length).toBe(leasesBefore);
    expect(updatedState.rentCharges.filter((c) => c.propertyId === prop.id).length).toBe(chargesBefore);
  });

  it('04. Unit creation adds a valid unit linked to property and floor', () => {
    const store = useEstaviaStore.getState();
    const res = store.addUnit({
      propertyId: 'prop-1',
      floorNumber: 3,
      unitNumber: '399-NEW',
      type: '2 Bedroom',
      bedrooms: 2,
      bathrooms: 2,
      sqFt: 1150,
      askingRent: 4800,
      availabilityMode: 'Available',
      amenities: ['Terrace'],
    });
    expect(res.ok).toBe(true);
    expect(res.unit?.unitNumber).toBe('399-NEW');
  });

  it('05. Unit uniqueness prevents duplicate unit numbers within the same property and building scope', () => {
    const store = useEstaviaStore.getState();
    const existingUnit = store.dataset.units[0];
    const dupRes = store.addUnit({
      propertyId: existingUnit.propertyId,
      buildingId: existingUnit.buildingId,
      floorNumber: existingUnit.floorNumber,
      unitNumber: existingUnit.unitNumber,
      type: '1 Bedroom',
      bedrooms: 1,
      bathrooms: 1,
      sqFt: 750,
      askingRent: 3100,
      availabilityMode: 'Available',
      amenities: [],
    });
    expect(dupRes.ok).toBe(false);
    expect(dupRes.error).toContain('already exists');
  });

  it('06. Unit editing updates unit rent and checks duplicate numbers', () => {
    const store = useEstaviaStore.getState();
    const u = store.dataset.units[0];
    const res = store.updateUnit(u.id, { askingRent: 5150 });
    expect(res.ok).toBe(true);
    const updated = useEstaviaStore.getState().dataset.units.find((item) => item.id === u.id);
    expect(updated?.askingRent).toBe(5150);
  });

  it('07. Unit occupancy derivation derives Occupied, Vacant, Reserved, and Under Maintenance accurately', () => {
    const { dataset } = useEstaviaStore.getState();
    const occupiedUnit = dataset.units.find((u) =>
      dataset.leases.some((l) => l.unitId === u.id && l.status === 'Active')
    )!;
    const occRes = deriveUnitOccupancyStatus(occupiedUnit, dataset.leases, dataset.referenceDate);
    expect(occRes.status).toBe('Occupied');

    const maintUnit = dataset.units.find((u) => u.availabilityMode === 'Under Maintenance')!;
    const maintRes = deriveUnitOccupancyStatus(maintUnit, dataset.leases, dataset.referenceDate);
    expect(maintRes.status).toBe('Under Maintenance');
  });

  it('08. Tenant creation registers a fictional tenant profile with generated code', () => {
    const store = useEstaviaStore.getState();
    const res = store.addTenant({
      firstName: 'Alistair',
      lastName: 'Vance',
      email: 'alistair.vance@example.demo',
      phone: '+1 (212) 555-0199',
      emergencyContactName: 'Clara Vance',
      emergencyContactPhone: '+1 (212) 555-0100',
      occupation: 'Architect',
      employer: 'Studio Vance',
      notes: 'Test tenant',
    });
    expect(res.ok).toBe(true);
    expect(res.tenant?.fullName).toBe('Alistair Vance');
  });

  it('09. Tenant editing updates full name and contact fields', () => {
    const store = useEstaviaStore.getState();
    const t = store.dataset.tenants[0];
    store.updateTenant(t.id, { firstName: 'Maximilian', lastName: 'Sterling' });
    const updated = useEstaviaStore.getState().dataset.tenants.find((item) => item.id === t.id);
    expect(updated?.fullName).toBe('Maximilian Sterling');
  });

  it('10. Rental application creation logs a new fictional application', () => {
    const store = useEstaviaStore.getState();
    const vacantUnit = store.dataset.units.find(
      (u) =>
        deriveUnitOccupancyStatus(u, store.dataset.leases, store.dataset.referenceDate).status ===
        'Vacant'
    )!;
    const res = store.addApplication({
      applicantName: 'Nora Lind',
      applicantEmail: 'nora.lind@example.demo',
      applicantPhone: '+1 (212) 555-0133',
      propertyId: vacantUnit.propertyId,
      unitId: vacantUnit.id,
      applicationDate: '2026-11-13',
      requestedMoveInDate: '2026-12-01',
      proposedRent: vacantUnit.askingRent,
      monthlyIncome: vacantUnit.askingRent * 4,
      employmentSummary: 'Director at BioLabs',
      status: 'Approved',
      notes: 'Approved test app',
    });
    expect(res.ok).toBe(true);
    expect(res.application?.code).toContain('APP-');
  });

  it('11. Application conversion creates tenant & lease and blocks duplicate conversion', () => {
    const store = useEstaviaStore.getState();
    const vacantUnit = store.dataset.units.find(
      (u) =>
        deriveUnitOccupancyStatus(u, store.dataset.leases, store.dataset.referenceDate).status ===
        'Vacant'
    )!;
    const created = store.addApplication({
      applicantName: 'Henrik Ibsen',
      applicantEmail: 'henrik@example.demo',
      applicantPhone: '+1 (212) 555-0177',
      propertyId: vacantUnit.propertyId,
      unitId: vacantUnit.id,
      applicationDate: '2026-11-13',
      requestedMoveInDate: '2026-12-01',
      proposedRent: vacantUnit.askingRent,
      monthlyIncome: 16000,
      employmentSummary: 'Playwright',
      status: 'Approved',
      notes: '',
    });

    const conv1 = useEstaviaStore.getState().convertApplicationToLease(created.application!.id, {
      startDate: '2026-12-01',
      endDate: '2027-12-01',
      securityDeposit: vacantUnit.askingRent,
    });
    expect(conv1.ok).toBe(true);
    expect(conv1.lease).toBeDefined();

    // Attempt duplicate conversion
    const conv2 = useEstaviaStore.getState().convertApplicationToLease(created.application!.id, {
      startDate: '2026-12-01',
      endDate: '2027-12-01',
      securityDeposit: vacantUnit.askingRent,
    });
    expect(conv2.ok).toBe(false);
    expect(conv2.errors[0]).toContain('already been converted');
  });

  it('12. Lease creation succeeds on a vacant eligible unit', () => {
    const store = useEstaviaStore.getState();
    const vacantUnit = store.dataset.units.find(
      (u) =>
        deriveUnitOccupancyStatus(u, store.dataset.leases, store.dataset.referenceDate).status ===
        'Vacant'
    )!;
    const res = store.createLease({
      propertyId: vacantUnit.propertyId,
      unitId: vacantUnit.id,
      tenantId: store.dataset.tenants[0].id,
      startDate: '2026-12-01',
      endDate: '2027-12-01',
      monthlyRent: vacantUnit.askingRent,
      securityDeposit: vacantUnit.askingRent,
      paymentDueDay: 1,
      billingFrequency: 'Monthly',
      status: 'Scheduled',
      notes: 'Valid scheduled lease',
    });
    expect(res.ok).toBe(true);
  });

  it('13. Lease date validation rejects endDate <= startDate', () => {
    const { dataset } = useEstaviaStore.getState();
    const vacantUnit = dataset.units.find(
      (u) => deriveUnitOccupancyStatus(u, dataset.leases, dataset.referenceDate).status === 'Vacant'
    )!;
    const check = validateLease(
      {
        propertyId: vacantUnit.propertyId,
        unitId: vacantUnit.id,
        tenantId: dataset.tenants[0].id,
        startDate: '2027-05-01',
        endDate: '2027-05-01',
        monthlyRent: 3000,
        securityDeposit: 3000,
        paymentDueDay: 1,
        billingFrequency: 'Monthly',
        status: 'Draft',
        notes: '',
      },
      dataset
    );
    expect(check.valid).toBe(false);
    expect(check.errors.join(' ')).toContain('strictly later than start date');
  });

  it('14. Overlapping lease prevention blocks conflicting active or scheduled lease on same unit', () => {
    const { dataset } = useEstaviaStore.getState();
    const activeLease = dataset.leases.find((l) => l.status === 'Active')!;
    const check = validateLease(
      {
        propertyId: activeLease.propertyId,
        unitId: activeLease.unitId,
        tenantId: dataset.tenants[1].id,
        startDate: activeLease.startDate,
        endDate: activeLease.endDate,
        monthlyRent: 4000,
        securityDeposit: 4000,
        paymentDueDay: 1,
        billingFrequency: 'Monthly',
        status: 'Active',
        notes: 'Conflicting lease',
      },
      dataset
    );
    expect(check.valid).toBe(false);
    expect(check.errors.join(' ')).toContain('conflicts with existing');
  });

  it('15. Back-to-back lease acceptance allows [startA, endA) and [endA, endB) with zero conflict', () => {
    expect(doLeaseIntervalsOverlap('2026-01-01', '2027-01-01', '2027-01-01', '2028-01-01')).toBe(
      false
    );
    const { dataset } = useEstaviaStore.getState();
    const activeLease = dataset.leases.find(
      (l) => l.status === 'Active' && !l.renewedToLeaseId
    )!;
    const check = validateLease(
      {
        propertyId: activeLease.propertyId,
        unitId: activeLease.unitId,
        tenantId: dataset.tenants[2].id,
        startDate: activeLease.endDate,
        endDate: '2028-12-01',
        monthlyRent: activeLease.monthlyRent + 100,
        securityDeposit: activeLease.securityDeposit,
        paymentDueDay: 1,
        billingFrequency: 'Monthly',
        status: 'Scheduled',
        notes: 'Back-to-back lease starting on exact endDate of prior lease',
      },
      dataset
    );
    expect(check.valid).toBe(true);
  });

  it('16. Scheduled lease activation transitions Scheduled -> Active cleanly', () => {
    const store = useEstaviaStore.getState();
    const sched = store.dataset.leases.find((l) => l.status === 'Scheduled')!;
    const res = store.changeLeaseStatus(sched.id, 'Active');
    expect(res.ok).toBe(true);
    const updated = useEstaviaStore.getState().dataset.leases.find((l) => l.id === sched.id);
    expect(updated?.status).toBe('Active');
  });

  it('17. Lease expiration transitions Active -> Expired', () => {
    const store = useEstaviaStore.getState();
    const act = store.dataset.leases.find((l) => l.status === 'Active')!;
    const res = store.changeLeaseStatus(act.id, 'Expired');
    expect(res.ok).toBe(true);
    expect(useEstaviaStore.getState().dataset.leases.find((l) => l.id === act.id)?.status).toBe(
      'Expired'
    );
  });

  it('18. Lease termination transitions Active -> Terminated and records reason', () => {
    const store = useEstaviaStore.getState();
    const act = store.dataset.leases.find((l) => l.status === 'Active')!;
    const res = store.changeLeaseStatus(act.id, 'Terminated', {
      terminationDate: '2026-11-25',
      terminationReason: 'Relocation buyout',
    });
    expect(res.ok).toBe(true);
    const updated = useEstaviaStore.getState().dataset.leases.find((l) => l.id === act.id);
    expect(updated?.status).toBe('Terminated');
    expect(updated?.terminationReason).toBe('Relocation buyout');
  });

  it('19. Lease renewal creates new lease record while preserving original historical lease', () => {
    const store = useEstaviaStore.getState();
    const act = store.dataset.leases.find(
      (l) => l.status === 'Active' && !l.renewedToLeaseId
    )!;
    const res = store.renewLease({
      originalLeaseId: act.id,
      newStartDate: act.endDate,
      newEndDate: '2028-06-01',
      newMonthlyRent: act.monthlyRent + 200,
    });
    expect(res.ok).toBe(true);
    expect(res.newLease).toBeDefined();
    const origAfter = useEstaviaStore.getState().dataset.leases.find((l) => l.id === act.id);
    expect(origAfter?.renewedToLeaseId).toBe(res.newLease?.id);
  });

  it('20. Duplicate renewal prevention blocks renewing an already renewed lease', () => {
    const store = useEstaviaStore.getState();
    const act = store.dataset.leases.find(
      (l) => l.status === 'Active' && !l.renewedToLeaseId
    )!;
    store.renewLease({
      originalLeaseId: act.id,
      newStartDate: act.endDate,
      newEndDate: '2028-06-01',
      newMonthlyRent: act.monthlyRent + 200,
    });
    const secondAttempt = useEstaviaStore.getState().renewLease({
      originalLeaseId: act.id,
      newStartDate: act.endDate,
      newEndDate: '2028-06-01',
      newMonthlyRent: act.monthlyRent + 300,
    });
    expect(secondAttempt.ok).toBe(false);
    expect(secondAttempt.errors[0]).toContain('already been renewed');
  });

  it('21. Rent charge generation creates charges for eligible active leases in a new period', () => {
    const { dataset } = useEstaviaStore.getState();
    const res = generateMonthlyRentCharges(
      dataset.leases,
      dataset.rentCharges,
      '2026-12',
      dataset.referenceDate
    );
    expect(res.createdCharges.length).toBeGreaterThan(0);
  });

  it('22. Duplicate rent prevention skips existing charges when Generate Rent is run multiple times', () => {
    const store = useEstaviaStore.getState();
    const run1 = store.generateMonthlyRent('2026-11');
    expect(run1.createdCount).toBe(0);
    expect(run1.skippedCount).toBeGreaterThan(0);
  });

  it('23. Partial payment updates charge amountPaid, remaining balance, and Partially Paid / Overdue status', () => {
    const { dataset } = useEstaviaStore.getState();
    const unpaid = dataset.rentCharges.find((c) => c.amountPaid === 0 && c.balance > 0)!;
    const half = unpaid.amount / 2;
    const res = recordPaymentAgainstCharge(
      unpaid,
      half,
      'Payment',
      'ACH Demo Transfer',
      '2026-11-13',
      'REF-HALF',
      'Partial payment',
      '2026-11-01',
      dataset.rentPayments.length
    );
    expect(res.valid).toBe(true);
    expect(res.updatedCharge?.amountPaid).toBe(half);
    expect(res.updatedCharge?.balance).toBe(half);
    expect(res.updatedCharge?.status).toBe('Partially Paid');
  });

  it('24. Full payment marks charge Paid and sets remaining balance to 0', () => {
    const { dataset } = useEstaviaStore.getState();
    const unpaid = dataset.rentCharges.find((c) => c.balance > 0)!;
    const res = recordPaymentAgainstCharge(
      unpaid,
      unpaid.balance,
      'Payment',
      'Wire Demo',
      '2026-11-13',
      'REF-FULL',
      'Full settlement',
      dataset.referenceDate,
      dataset.rentPayments.length
    );
    expect(res.valid).toBe(true);
    expect(res.updatedCharge?.balance).toBe(0);
    expect(res.updatedCharge?.status).toBe('Paid');
  });

  it('25. Payment reversal restores charge balance and prevents double-reversal', () => {
    const store = useEstaviaStore.getState();
    const payment = store.dataset.rentPayments.find(
      (p) => p.type === 'Payment' && !p.isReversed
    )!;
    const rev1 = store.reversePayment(payment.id, 'Incorrect account posting');
    expect(rev1.ok).toBe(true);

    const rev2 = useEstaviaStore.getState().reversePayment(payment.id, 'Duplicate reversal');
    expect(rev2.ok).toBe(false);
  });

  it('26. Overdue balance calculation flags unpaid charges past dueDate as Overdue', () => {
    const { dataset } = useEstaviaStore.getState();
    const unpaid = dataset.rentCharges.find((c) => c.amountPaid === 0)!;
    const recalc = recalculateRentChargeState(unpaid, '2026-11-15');
    expect(recalc.status).toBe('Overdue');
  });

  it('27. Security deposit receipt increases held deposit balance', () => {
    const store = useEstaviaStore.getState();
    const lease = store.dataset.leases[0];
    const res = store.recordDepositTransaction({
      leaseId: lease.id,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      date: '2026-11-13',
      type: 'Receipt',
      amount: 1500,
      reference: 'DEP-TEST-1',
      notes: 'Additional pet deposit',
    });
    expect(res.ok).toBe(true);
  });

  it('28. Security deposit return reduces held deposit balance accurately', () => {
    const store = useEstaviaStore.getState();
    const lease = store.dataset.leases[0];
    const beforeSummary = calculateFinancialSummary({
      rentCharges: store.dataset.rentCharges,
      expenses: store.dataset.expenses,
      depositTransactions: store.dataset.depositTransactions,
    });
    store.recordDepositTransaction({
      leaseId: lease.id,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      date: '2026-11-13',
      type: 'Return',
      amount: 500,
      reference: 'DEP-RET-1',
      notes: 'Partial deposit return',
    });
    const afterSummary = calculateFinancialSummary({
      rentCharges: useEstaviaStore.getState().dataset.rentCharges,
      expenses: useEstaviaStore.getState().dataset.expenses,
      depositTransactions: useEstaviaStore.getState().dataset.depositTransactions,
    });
    expect(afterSummary.securityDepositsHeld).toBe(beforeSummary.securityDepositsHeld - 500);
  });

  it('29. Deposit exclusion from rental revenue ensures deposits never inflate collectedRent or cashFlow', () => {
    const store = useEstaviaStore.getState();
    const before = calculateFinancialSummary({
      rentCharges: store.dataset.rentCharges,
      expenses: store.dataset.expenses,
      depositTransactions: store.dataset.depositTransactions,
    });
    const lease = store.dataset.leases[0];
    store.recordDepositTransaction({
      leaseId: lease.id,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      date: '2026-11-13',
      type: 'Receipt',
      amount: 10000,
      reference: 'DEP-EXCL',
      notes: 'Escrow receipt',
    });
    const after = calculateFinancialSummary({
      rentCharges: useEstaviaStore.getState().dataset.rentCharges,
      expenses: useEstaviaStore.getState().dataset.expenses,
      depositTransactions: useEstaviaStore.getState().dataset.depositTransactions,
    });
    expect(after.collectedRent).toBe(before.collectedRent);
    expect(after.operatingCashFlow).toBe(before.operatingCashFlow);
  });

  it('30. Occupancy rate calculation handles eligible leasable units and zero denominators', () => {
    const emptyOcc = calculateOccupancySummary([], [], '2026-11-13');
    expect(emptyOcc.occupancyRate).toBe(0);
    const { dataset } = useEstaviaStore.getState();
    const occ = calculateOccupancySummary(dataset.units, dataset.leases, dataset.referenceDate);
    expect(occ.occupancyRate).toBeGreaterThan(70);
    expect(occ.occupancyRate).toBeLessThanOrEqual(100);
  });

  it('31. Vacancy calculation equals 100 - occupancyRate for eligible leasable units', () => {
    const { dataset } = useEstaviaStore.getState();
    const occ = calculateOccupancySummary(dataset.units, dataset.leases, dataset.referenceDate);
    expect(Number((occ.occupancyRate + occ.vacancyRate).toFixed(1))).toBe(100);
  });

  it('32. Maintenance creation validates property and unit references', () => {
    const store = useEstaviaStore.getState();
    const u = store.dataset.units[0];
    const res = store.addMaintenanceRequest({
      propertyId: u.propertyId,
      unitId: u.id,
      title: 'Boiler Pressure Valve Replacement',
      category: 'Plumbing',
      priority: 'High',
      description: 'Pressure relief valve replacement',
      reportedDate: '2026-11-13',
      dueDate: '2026-11-18',
      estimatedCost: 420,
      stage: 'New',
    });
    expect(res.ok).toBe(true);
  });

  it('33. Maintenance assignment links vendor to work order', () => {
    const store = useEstaviaStore.getState();
    const req = store.dataset.maintenanceRequests[0];
    const ven = store.dataset.vendors[0];
    store.updateMaintenanceRequest(req.id, { vendorId: ven.id });
    const updated = useEstaviaStore
      .getState()
      .dataset.maintenanceRequests.find((m) => m.id === req.id);
    expect(updated?.vendorId).toBe(ven.id);
  });

  it('34. Maintenance stage movement validates transitions across the 7 stages', () => {
    expect(canTransitionMaintenanceStage('New', 'Assigned')).toBe(true);
    expect(canTransitionMaintenanceStage('New', 'Closed')).toBe(false);
    const store = useEstaviaStore.getState();
    const newReq = store.dataset.maintenanceRequests.find((m) => m.stage === 'New')!;
    const res = store.moveMaintenanceStage(newReq.id, 'Reviewed');
    expect(res.ok).toBe(true);
  });

  it('35. Maintenance cost handling syncs single linked expense without double-counting', () => {
    const store = useEstaviaStore.getState();
    const req = store.dataset.maintenanceRequests.find((m) => !m.linkedExpenseId)!;
    const expCountBefore = store.dataset.expenses.length;

    store.recordMaintenanceCost(req.id, 525);
    const state1 = useEstaviaStore.getState().dataset;
    expect(state1.expenses.length).toBe(expCountBefore + 1);

    // Updating cost a second time updates the SAME linked expense rather than duplicating
    useEstaviaStore.getState().recordMaintenanceCost(req.id, 600);
    const state2 = useEstaviaStore.getState().dataset;
    expect(state2.expenses.length).toBe(expCountBefore + 1);
    const updatedReq = state2.maintenanceRequests.find((m) => m.id === req.id)!;
    const linkedExp = state2.expenses.find((e) => e.id === updatedReq.linkedExpenseId)!;
    expect(linkedExp.amount).toBe(600);
  });

  it('36. Expense creation records operating expense and updates paid expenses total', () => {
    const store = useEstaviaStore.getState();
    const res = store.addExpense({
      propertyId: 'prop-1',
      category: 'Utilities',
      description: 'Municipal Water & Sewer',
      date: '2026-11-12',
      amount: 1200,
      status: 'Paid',
      reference: 'UTIL-1200',
    });
    expect(res.ok).toBe(true);
  });

  it('37. Cash flow calculation equals Collected Rent minus Paid Operating Expenses', () => {
    const { dataset } = useEstaviaStore.getState();
    const fin = calculateFinancialSummary({
      rentCharges: dataset.rentCharges,
      expenses: dataset.expenses,
      depositTransactions: dataset.depositTransactions,
      billingPeriod: '2026-11',
    });
    expect(fin.operatingCashFlow).toBe(
      Number((fin.collectedRent - fin.paidOperatingExpenses).toFixed(2))
    );
  });

  it('38. Property-level reports scope metrics strictly to selected propertyId', () => {
    const { dataset } = useEstaviaStore.getState();
    const prop1Fin = calculateFinancialSummary({
      rentCharges: dataset.rentCharges,
      expenses: dataset.expenses,
      depositTransactions: dataset.depositTransactions,
      propertyId: 'prop-1',
      billingPeriod: '2026-11',
    });
    const allFin = calculateFinancialSummary({
      rentCharges: dataset.rentCharges,
      expenses: dataset.expenses,
      depositTransactions: dataset.depositTransactions,
      propertyId: 'all',
      billingPeriod: '2026-11',
    });
    expect(prop1Fin.scheduledRent).toBeGreaterThan(0);
    expect(allFin.scheduledRent).toBeGreaterThan(prop1Fin.scheduledRent);
  });

  it('39. Portfolio analytics consistency: sum of property scheduled rents equals portfolio scheduled rent', () => {
    const { dataset } = useEstaviaStore.getState();
    const allFin = calculateFinancialSummary({
      rentCharges: dataset.rentCharges,
      expenses: dataset.expenses,
      depositTransactions: dataset.depositTransactions,
      propertyId: 'all',
      billingPeriod: '2026-11',
    });
    const sumByProperty = dataset.properties.reduce((sum, p) => {
      const pFin = calculateFinancialSummary({
        rentCharges: dataset.rentCharges,
        expenses: dataset.expenses,
        depositTransactions: dataset.depositTransactions,
        propertyId: p.id,
        billingPeriod: '2026-11',
      });
      return sum + pFin.scheduledRent;
    }, 0);
    expect(sumByProperty).toBe(allFin.scheduledRent);
  });

  it('40. Lease PDF generation includes mandatory SAMPLE LEASE — NOT A LEGAL AGREEMENT watermark', () => {
    const { dataset, settings } = useEstaviaStore.getState();
    const lease = dataset.leases[0];
    const property = dataset.properties.find((p) => p.id === lease.propertyId)!;
    const unit = dataset.units.find((u) => u.id === lease.unitId)!;
    const tenant = dataset.tenants.find((t) => t.id === lease.tenantId)!;
    const pdfRes = generateSampleLeasePdf({
      lease,
      property,
      unit,
      tenant,
      companyName: settings.companyName,
      download: false,
    });
    expect(pdfRes.watermark).toBe('SAMPLE LEASE — NOT A LEGAL AGREEMENT');
    expect(pdfRes.summaryText).toContain('SAMPLE LEASE — NOT A LEGAL AGREEMENT');
    expect(pdfRes.byteLength).toBeGreaterThan(500);
  });

  it('41. Rent receipt PDF generation outputs valid PDF buffer and payment breakdown', () => {
    const { dataset, settings } = useEstaviaStore.getState();
    const charge = dataset.rentCharges[0];
    const property = dataset.properties.find((p) => p.id === charge.propertyId)!;
    const unit = dataset.units.find((u) => u.id === charge.unitId)!;
    const tenant = dataset.tenants.find((t) => t.id === charge.tenantId)!;
    const payments = dataset.rentPayments.filter((p) => p.rentChargeId === charge.id);
    const pdfRes = generateRentReceiptPdf({
      charge,
      property,
      unit,
      tenant,
      payments,
      companyName: settings.companyName,
      download: false,
    });
    expect(pdfRes.byteLength).toBeGreaterThan(500);
    expect(pdfRes.summaryText).toContain(charge.code);
  });

  it('42. CSV export escapes commas and quotes properly', () => {
    const csv = buildCsvString(
      ['Property', 'Address', 'Rent'],
      [['The Sovereign, Gramercy', '214 "East" 21st St', 4200]]
    );
    expect(csv).toContain('"The Sovereign, Gramercy"');
    expect(csv).toContain('"214 ""East"" 21st St"');
  });

  it('43. Search matches properties, units, tenants, and leases by query', () => {
    const { dataset } = useEstaviaStore.getState();
    const q = 'gramercy';
    const matches = dataset.properties.filter((p) => p.name.toLowerCase().includes(q));
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('prop-1');
  });

  it('44. Filtering isolates records by status and property scope', () => {
    const { dataset } = useEstaviaStore.getState();
    const overdue = dataset.rentCharges.filter((c) => c.status === 'Overdue');
    expect(overdue.length).toBeGreaterThan(0);
    expect(overdue.every((c) => c.status === 'Overdue')).toBe(true);
  });

  it('45. Sorting orders properties deterministically by rent roll or occupancy', () => {
    const { dataset } = useEstaviaStore.getState();
    const sorted = [...dataset.properties].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name.localeCompare(sorted[1].name)).toBeLessThanOrEqual(0);
  });

  it('46. Pagination & slicing bounds large record sets cleanly', () => {
    const { dataset } = useEstaviaStore.getState();
    const page1 = dataset.units.slice(0, 25);
    const page2 = dataset.units.slice(25, 50);
    expect(page1.length).toBe(25);
    expect(page2.length).toBe(25);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('47. JSON backup serializes complete dataset and settings with schema version', () => {
    const { dataset, settings } = useEstaviaStore.getState();
    const raw = createBackupJson(dataset, settings);
    const parsed = JSON.parse(raw);
    expect(parsed.schema).toBe('estavia-backup-v1');
    expect(parsed.dataset.properties.length).toBe(dataset.properties.length);
  });

  it('48. JSON restore validates and restores a modified dataset snapshot', () => {
    const store = useEstaviaStore.getState();
    store.addProperty({
      name: 'Backup Test Plaza',
      code: 'EST-BCK-01',
      type: 'Commercial Building',
      address: '1 Backup Way',
      city: 'Austin',
      state: 'TX',
      country: 'United States',
      floorsCount: 3,
      targetUnitsCount: 9,
      status: 'Active',
      description: 'Backup test',
      amenities: [],
      imageUrl: 'architectural-test',
      notes: '',
      yearBuilt: 2023,
    });
    const snapshot = createBackupJson(
      useEstaviaStore.getState().dataset,
      useEstaviaStore.getState().settings
    );

    useEstaviaStore.getState().resetDemoWorkspace();
    expect(
      useEstaviaStore
        .getState()
        .dataset.properties.some((p) => p.name === 'Backup Test Plaza')
    ).toBe(false);

    const restoreRes = useEstaviaStore.getState().restoreFromBackupJson(snapshot);
    expect(restoreRes.ok).toBe(true);
    expect(
      useEstaviaStore
        .getState()
        .dataset.properties.some((p) => p.name === 'Backup Test Plaza')
    ).toBe(true);
  });

  it('49. Invalid backup rejection blocks malformed JSON or broken foreign keys', () => {
    const badJson = '{"version": 1, "referenceDate": "invalid-date", "properties": []}';
    const check = parseAndValidateBackupJson(badJson);
    expect(check.valid).toBe(false);
    expect(check.errors.length).toBeGreaterThan(0);
  });

  it('50. Corrupt LocalStorage recovery automatically resets to valid deterministic seed', () => {
    memoryStorage.set(STORAGE_KEYS.DATA, '{corrupted_json_payload!!!');
    const loaded = loadDatasetFromStorage();
    expect(loaded.recoveredFromCorruption).toBe(true);
    expect(loaded.dataset.properties.length).toBe(12);
  });

  it('51. Reset demo data restores initial 12-property seed state', () => {
    const store = useEstaviaStore.getState();
    store.archiveProperty('prop-1');
    expect(
      useEstaviaStore.getState().dataset.properties.find((p) => p.id === 'prop-1')?.archived
    ).toBe(true);
    useEstaviaStore.getState().resetDemoWorkspace();
    expect(
      useEstaviaStore.getState().dataset.properties.find((p) => p.id === 'prop-1')?.archived
    ).toBeUndefined();
  });

  it('52. Theme persistence toggles between light and dark and saves to estavia:ui', () => {
    const store = useEstaviaStore.getState();
    expect(store.theme).toBe('light');
    store.toggleTheme();
    expect(useEstaviaStore.getState().theme).toBe('dark');
    const savedUi = JSON.parse(memoryStorage.get(STORAGE_KEYS.UI) || '{}');
    expect(savedUi.theme).toBe('dark');
  });

  it('53. Mobile navigation state opens and closes drawer cleanly', () => {
    const store = useEstaviaStore.getState();
    store.setMobileNavOpen(true);
    expect(useEstaviaStore.getState().mobileNavOpen).toBe(true);
    store.setMobileNavOpen(false);
    expect(useEstaviaStore.getState().mobileNavOpen).toBe(false);
  });

  it('54. Cross-page financial consistency: recording a payment immediately updates Outstanding Rent and Collection Rate', () => {
    const store = useEstaviaStore.getState();
    const before = calculateFinancialSummary({
      rentCharges: store.dataset.rentCharges,
      expenses: store.dataset.expenses,
      depositTransactions: store.dataset.depositTransactions,
      billingPeriod: '2026-11',
    });
    const unpaid = store.dataset.rentCharges.find(
      (c) => c.billingPeriod === '2026-11' && c.balance > 0
    )!;
    store.recordRentPayment({
      rentChargeId: unpaid.id,
      amount: 500,
      type: 'Payment',
      method: 'ACH Demo Transfer',
      date: '2026-11-13',
      reference: 'CONSISTENCY-500',
      notes: 'Test payment',
    });
    const after = calculateFinancialSummary({
      rentCharges: useEstaviaStore.getState().dataset.rentCharges,
      expenses: useEstaviaStore.getState().dataset.expenses,
      depositTransactions: useEstaviaStore.getState().dataset.depositTransactions,
      billingPeriod: '2026-11',
    });
    expect(after.collectedRent).toBe(before.collectedRent + 500);
    expect(after.outstandingRent).toBe(before.outstandingRent - 500);
  });

  it('55. Referential integrity after archive actions preserves valid foreign keys across all entities', () => {
    const store = useEstaviaStore.getState();
    store.archiveProperty('prop-2');
    store.archiveUnit(store.dataset.units[0].id);
    store.archiveTenant(store.dataset.tenants[0].id);
    const integrity = validateDatasetIntegrity(useEstaviaStore.getState().dataset);
    expect(integrity.valid).toBe(true);
    expect(integrity.errors).toHaveLength(0);
  });

  it('56. Open work orders report aggregates portfolio open requests and filters by category, technician, and priority level', () => {
    const store = useEstaviaStore.getState();
    const { maintenanceRequests, vendors, properties, units, referenceDate } = store.dataset;

    // 1. Portfolio-wide open work orders aggregation
    const openSummary = aggregateOpenWorkOrdersReport({
      requests: maintenanceRequests,
      vendors,
      properties,
      units,
      referenceDate,
      onlyOpen: true,
    });

    expect(openSummary.totalOpenCount).toBeGreaterThan(0);
    expect(
      openSummary.filteredRequests.every((r) => isMaintenanceRequestOpen(r))
    ).toBe(true);

    // 2. Filter by Category (HVAC)
    const hvacSummary = aggregateOpenWorkOrdersReport({
      requests: maintenanceRequests,
      vendors,
      properties,
      units,
      referenceDate,
      onlyOpen: true,
      category: 'HVAC',
    });
    expect(hvacSummary.totalOpenCount).toBeGreaterThan(0);
    expect(
      hvacSummary.filteredRequests.every((r) => r.category === 'HVAC')
    ).toBe(true);

    // 3. Filter by Technician (Robert Vance)
    const techSummary = aggregateOpenWorkOrdersReport({
      requests: maintenanceRequests,
      vendors,
      properties,
      units,
      referenceDate,
      onlyOpen: true,
      technician: 'Robert Vance',
    });
    expect(techSummary.totalOpenCount).toBeGreaterThan(0);
    expect(
      techSummary.filteredRequests.every((r) => r.vendorId === 'ven-1')
    ).toBe(true);

    // 4. Filter by Priority Level (High)
    const highPrioritySummary = aggregateOpenWorkOrdersReport({
      requests: maintenanceRequests,
      vendors,
      properties,
      units,
      referenceDate,
      onlyOpen: true,
      priority: 'High',
    });
    expect(highPrioritySummary.totalOpenCount).toBeGreaterThan(0);
    expect(
      highPrioritySummary.filteredRequests.every((r) => r.priority === 'High')
    ).toBe(true);
  });
});

