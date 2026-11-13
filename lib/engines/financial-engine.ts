import Decimal from 'decimal.js';
import {
  PropertyExpense,
  RentCharge,
  RentPayment,
  SecurityDepositTransaction,
} from '../types';

export interface FinancialSummary {
  scheduledRent: number;
  collectedRent: number;
  creditsApplied: number;
  outstandingRent: number;
  overdueRent: number;
  collectionRate: number;
  paidOperatingExpenses: number;
  pendingOperatingExpenses: number;
  operatingCashFlow: number;
  securityDepositsHeld: number;
  securityDepositsReceived: number;
  securityDepositsReturned: number;
  securityDepositsDeducted: number;
}

/**
 * Calculates portfolio or property-scoped financial metrics using Decimal.js.
 *
 * Explicit Formulas:
 * - Scheduled Rent = Sum of non-voided Rent Charges in scope
 * - Collected Rent = Sum of non-reversed Rent Payments (or charge.amountPaid) in scope
 * - Outstanding Rent = Valid Rent Charges - Allocated Payments - Applicable Credits
 * - Collection Rate = (Collected Rent / Scheduled Rent) * 100 (0 if Scheduled Rent == 0)
 * - Operating Cash Flow = Collected Rent - Actual Paid Operating Expenses
 * - Security Deposits are strictly excluded from rental revenue and operating cash flow.
 */
export function calculateFinancialSummary(params: {
  rentCharges: RentCharge[];
  rentPayments?: RentPayment[];
  expenses: PropertyExpense[];
  depositTransactions: SecurityDepositTransaction[];
  propertyId?: string;
  billingPeriod?: string; // Optional YYYY-MM filter
}): FinancialSummary {
  const {
    rentCharges,
    expenses,
    depositTransactions,
    propertyId,
    billingPeriod,
  } = params;

  const validCharges = rentCharges.filter((c) => {
    if (c.status === 'Voided') return false;
    if (propertyId && propertyId !== 'all' && c.propertyId !== propertyId) return false;
    if (billingPeriod && billingPeriod !== 'all' && c.billingPeriod !== billingPeriod) return false;
    return true;
  });

  let scheduled = new Decimal(0);
  let collected = new Decimal(0);
  let credits = new Decimal(0);
  let outstanding = new Decimal(0);
  let overdue = new Decimal(0);

  for (const c of validCharges) {
    scheduled = scheduled.plus(c.amount);
    collected = collected.plus(c.amountPaid);
    credits = credits.plus(c.creditsApplied);
    const bal = Decimal.max(
      0,
      new Decimal(c.amount).minus(c.amountPaid).minus(c.creditsApplied)
    );
    outstanding = outstanding.plus(bal);
    if (c.status === 'Overdue') {
      overdue = overdue.plus(bal);
    }
  }

  const collectionRate = scheduled.gt(0)
    ? collected.div(scheduled).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  const scopedExpenses = expenses.filter((e) => {
    if (e.archived) return false;
    if (propertyId && propertyId !== 'all' && e.propertyId !== propertyId) return false;
    if (billingPeriod && billingPeriod !== 'all' && !e.date.startsWith(billingPeriod)) return false;
    return true;
  });

  let paidExpenses = new Decimal(0);
  let pendingExpenses = new Decimal(0);

  for (const exp of scopedExpenses) {
    if (exp.status === 'Paid') {
      paidExpenses = paidExpenses.plus(exp.amount);
    } else if (exp.status === 'Pending') {
      pendingExpenses = pendingExpenses.plus(exp.amount);
    }
  }

  const operatingCashFlow = collected.minus(paidExpenses);

  const scopedDeposits = depositTransactions.filter((d) => {
    if (propertyId && propertyId !== 'all' && d.propertyId !== propertyId) return false;
    return true;
  });

  let depReceived = new Decimal(0);
  let depReturned = new Decimal(0);
  let depDeducted = new Decimal(0);

  for (const d of scopedDeposits) {
    if (d.type === 'Receipt') depReceived = depReceived.plus(d.amount);
    if (d.type === 'Return') depReturned = depReturned.plus(d.amount);
    if (d.type === 'Deduction') depDeducted = depDeducted.plus(d.amount);
  }

  const depHeld = Decimal.max(0, depReceived.minus(depReturned).minus(depDeducted));

  return {
    scheduledRent: scheduled.toDecimalPlaces(2).toNumber(),
    collectedRent: collected.toDecimalPlaces(2).toNumber(),
    creditsApplied: credits.toDecimalPlaces(2).toNumber(),
    outstandingRent: outstanding.toDecimalPlaces(2).toNumber(),
    overdueRent: overdue.toDecimalPlaces(2).toNumber(),
    collectionRate,
    paidOperatingExpenses: paidExpenses.toDecimalPlaces(2).toNumber(),
    pendingOperatingExpenses: pendingExpenses.toDecimalPlaces(2).toNumber(),
    operatingCashFlow: operatingCashFlow.toDecimalPlaces(2).toNumber(),
    securityDepositsHeld: depHeld.toDecimalPlaces(2).toNumber(),
    securityDepositsReceived: depReceived.toDecimalPlaces(2).toNumber(),
    securityDepositsReturned: depReturned.toDecimalPlaces(2).toNumber(),
    securityDepositsDeducted: depDeducted.toDecimalPlaces(2).toNumber(),
  };
}
