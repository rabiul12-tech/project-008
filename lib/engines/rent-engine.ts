import Decimal from 'decimal.js';
import {
  Lease,
  PaymentAllocation,
  RentCharge,
  RentChargeStatus,
  RentPayment,
} from '../types';

/**
 * Generates an idempotency key for a rent charge: `${leaseId}:${billingPeriod}:${chargeType}`
 */
export function buildRentChargeIdempotencyKey(
  leaseId: string,
  billingPeriod: string,
  chargeType: 'Base Rent' | 'Late Fee' | 'Prorated Rent' = 'Base Rent'
): string {
  return `${leaseId}:${billingPeriod}:${chargeType}`;
}

/**
 * Determines if a lease is eligible for billing in a given YYYY-MM period.
 * A lease is eligible if its status is Active (or Expired/Terminated after the period started)
 * and the half-open interval [startDate, effectiveEndDate) intersects the billing month.
 */
export function isLeaseEligibleForBillingPeriod(
  lease: Lease,
  billingPeriod: string // YYYY-MM
): boolean {
  if (lease.status !== 'Active' && lease.status !== 'Expired' && lease.status !== 'Terminated') {
    return false;
  }
  const [yearStr, monthStr] = billingPeriod.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) return false;

  const periodStart = `${billingPeriod}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const periodEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const effectiveLeaseEnd =
    lease.terminationDate && lease.terminationDate < lease.endDate
      ? lease.terminationDate
      : lease.endDate;

  return lease.startDate < periodEnd && periodStart < effectiveLeaseEnd;
}

/**
 * Computes the status and remaining balance of a RentCharge using Decimal.js
 */
export function recalculateRentChargeState(
  charge: RentCharge,
  referenceDate: string
): RentCharge {
  if (charge.status === 'Voided') {
    return {
      ...charge,
      balance: 0,
    };
  }

  const total = new Decimal(charge.amount);
  const paid = new Decimal(charge.amountPaid);
  const credits = new Decimal(charge.creditsApplied);
  const rawBalance = total.minus(paid).minus(credits);
  const balance = Decimal.max(0, rawBalance).toDecimalPlaces(2).toNumber();

  let status: RentChargeStatus = 'Unpaid';
  if (balance === 0) {
    status = 'Paid';
  } else if (paid.plus(credits).gt(0)) {
    status = referenceDate > charge.dueDate ? 'Overdue' : 'Partially Paid';
  } else if (referenceDate > charge.dueDate) {
    status = 'Overdue';
  } else {
    status = 'Unpaid';
  }

  return {
    ...charge,
    balance,
    status,
  };
}

/**
 * Generates monthly rent charges for all eligible leases in `billingPeriod` (YYYY-MM).
 * Idempotent: skips any lease that already has a non-voided Base Rent charge for that period.
 */
export function generateMonthlyRentCharges(
  leases: Lease[],
  existingCharges: RentCharge[],
  billingPeriod: string,
  referenceDate: string
): {
  createdCharges: RentCharge[];
  skippedCount: number;
} {
  const existingKeys = new Set(
    existingCharges
      .filter((c) => c.status !== 'Voided')
      .map((c) => c.idempotencyKey)
  );

  const createdCharges: RentCharge[] = [];
  let skippedCount = 0;

  let seq = existingCharges.length + 1001;

  for (const lease of leases) {
    if (lease.status !== 'Active') continue;
    if (!isLeaseEligibleForBillingPeriod(lease, billingPeriod)) continue;

    const idempotencyKey = buildRentChargeIdempotencyKey(
      lease.id,
      billingPeriod,
      'Base Rent'
    );

    if (existingKeys.has(idempotencyKey)) {
      skippedCount++;
      continue;
    }

    const dueDay = String(Math.min(28, Math.max(1, lease.paymentDueDay))).padStart(2, '0');
    const dueDate = `${billingPeriod}-${dueDay}`;
    const amount = new Decimal(lease.monthlyRent).toDecimalPlaces(2).toNumber();

    const baseCharge: RentCharge = {
      id: `rc-${lease.id}-${billingPeriod}`,
      code: `INV-${seq++}`,
      idempotencyKey,
      leaseId: lease.id,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      billingPeriod,
      chargeType: 'Base Rent',
      dueDate,
      amount,
      amountPaid: 0,
      creditsApplied: 0,
      balance: amount,
      status: referenceDate > dueDate ? 'Overdue' : 'Unpaid',
      notes: `Monthly rent charge for ${billingPeriod}`,
      createdAt: referenceDate,
    };

    createdCharges.push(recalculateRentChargeState(baseCharge, referenceDate));
    existingKeys.add(idempotencyKey);
  }

  return { createdCharges, skippedCount };
}

/**
 * Applies a partial or full payment or credit to a RentCharge using Decimal.js.
 */
export function recordPaymentAgainstCharge(
  charge: RentCharge,
  amountInput: number,
  paymentType: 'Payment' | 'Credit',
  method: RentPayment['method'],
  date: string,
  reference: string,
  notes: string,
  referenceDate: string,
  existingPaymentsCount: number
): {
  valid: boolean;
  error?: string;
  updatedCharge?: RentCharge;
  paymentRecord?: RentPayment;
  allocationRecord?: PaymentAllocation;
} {
  if (charge.status === 'Voided') {
    return { valid: false, error: 'Cannot record payment against a voided rent charge.' };
  }

  const amount = new Decimal(amountInput).toDecimalPlaces(2);
  if (amount.lte(0)) {
    return { valid: false, error: 'Payment amount must be greater than zero.' };
  }

  const currentBalance = new Decimal(charge.balance).toDecimalPlaces(2);
  if (amount.gt(currentBalance)) {
    return {
      valid: false,
      error: `Amount ($${amount.toFixed(2)}) exceeds outstanding charge balance ($${currentBalance.toFixed(2)}).`,
    };
  }

  const newPaid =
    paymentType === 'Payment'
      ? new Decimal(charge.amountPaid).plus(amount).toDecimalPlaces(2).toNumber()
      : charge.amountPaid;

  const newCredits =
    paymentType === 'Credit'
      ? new Decimal(charge.creditsApplied).plus(amount).toDecimalPlaces(2).toNumber()
      : charge.creditsApplied;

  const updatedCharge = recalculateRentChargeState(
    {
      ...charge,
      amountPaid: newPaid,
      creditsApplied: newCredits,
    },
    referenceDate
  );

  const seq = existingPaymentsCount + 5001;
  const paymentId = `pay-${charge.id}-${seq}`;

  const paymentRecord: RentPayment = {
    id: paymentId,
    code: `PMT-${seq}`,
    rentChargeId: charge.id,
    leaseId: charge.leaseId,
    propertyId: charge.propertyId,
    unitId: charge.unitId,
    tenantId: charge.tenantId,
    date,
    amount: amount.toNumber(),
    type: paymentType,
    method,
    reference: reference || `REF-${seq}`,
    notes,
    createdAt: referenceDate,
  };

  const allocationRecord: PaymentAllocation = {
    id: `alloc-${paymentId}`,
    paymentId,
    rentChargeId: charge.id,
    amount: amount.toNumber(),
  };

  return {
    valid: true,
    updatedCharge,
    paymentRecord,
    allocationRecord,
  };
}

/**
 * Reverses a previously recorded payment without double-counting.
 */
export function reverseRentPayment(
  payment: RentPayment,
  charge: RentCharge,
  referenceDate: string,
  existingPaymentsCount: number,
  reason: string
): {
  valid: boolean;
  error?: string;
  updatedOriginalPayment?: RentPayment;
  reversalPayment?: RentPayment;
  updatedCharge?: RentCharge;
} {
  if (payment.isReversed) {
    return { valid: false, error: 'This payment has already been reversed.' };
  }
  if (payment.type === 'Reversal') {
    return { valid: false, error: 'Cannot reverse a reversal record.' };
  }

  const amt = new Decimal(payment.amount);
  const newPaid =
    payment.type === 'Payment'
      ? Decimal.max(0, new Decimal(charge.amountPaid).minus(amt)).toDecimalPlaces(2).toNumber()
      : charge.amountPaid;
  const newCredits =
    payment.type === 'Credit'
      ? Decimal.max(0, new Decimal(charge.creditsApplied).minus(amt)).toDecimalPlaces(2).toNumber()
      : charge.creditsApplied;

  const updatedCharge = recalculateRentChargeState(
    {
      ...charge,
      amountPaid: newPaid,
      creditsApplied: newCredits,
    },
    referenceDate
  );

  const updatedOriginalPayment: RentPayment = {
    ...payment,
    isReversed: true,
  };

  const seq = existingPaymentsCount + 5001;
  const reversalPayment: RentPayment = {
    id: `rev-${payment.id}-${seq}`,
    code: `REV-${seq}`,
    rentChargeId: charge.id,
    leaseId: charge.leaseId,
    propertyId: charge.propertyId,
    unitId: charge.unitId,
    tenantId: charge.tenantId,
    date: referenceDate,
    amount: payment.amount,
    type: 'Reversal',
    method: payment.method,
    reference: `REV-OF-${payment.code}`,
    reversedPaymentId: payment.id,
    notes: reason || `Reversal of ${payment.code}`,
    createdAt: referenceDate,
  };

  return {
    valid: true,
    updatedOriginalPayment,
    reversalPayment,
    updatedCharge,
  };
}
