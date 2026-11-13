import { jsPDF } from 'jspdf';
import {
  Lease,
  Property,
  RentCharge,
  RentPayment,
  Tenant,
  Unit,
} from '../types';

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generates a CSV string from rows and headers.
 */
export function buildCsvString(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): string {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  return lines.join('\n');
}

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): string {
  const csv = buildCsvString(headers, rows);
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  return csv;
}

/**
 * Generates a Sample Lease Agreement PDF clearly marked:
 * "SAMPLE LEASE — NOT A LEGAL AGREEMENT"
 */
export function generateSampleLeasePdf(params: {
  lease: Lease;
  property: Property;
  unit: Unit;
  tenant: Tenant;
  companyName: string;
  download?: boolean;
}): { watermark: string; byteLength: number; summaryText: string } {
  const { lease, property, unit, tenant, companyName, download = true } = params;
  const watermark = 'SAMPLE LEASE — NOT A LEGAL AGREEMENT';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  // Top Banner
  doc.setFillColor(20, 108, 99);
  doc.rect(0, 0, 612, 72, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('ESTAVIA PROPERTY MANAGEMENT', 40, 34);
  doc.setFontSize(10);
  doc.text(watermark, 40, 54);

  // Body
  doc.setTextColor(28, 41, 39);
  doc.setFontSize(14);
  doc.text(`Residential / Commercial Lease Summary — ${lease.code}`, 40, 110);

  doc.setFontSize(10);
  const lines = [
    `NOTICE: ${watermark}`,
    `This document is generated locally in the browser for portfolio demonstration purposes only.`,
    ``,
    `1. PARTIES & PROPERTY`,
    `   Managing Organization: ${companyName}`,
    `   Property: ${property.name} (${property.code})`,
    `   Address: ${property.address}, ${property.city}, ${property.state}`,
    `   Unit Number: Unit ${unit.unitNumber} (${unit.type}, ${unit.sqFt} sq ft)`,
    `   Resident / Tenant: ${tenant.fullName} (${tenant.code})`,
    `   Contact Email (Fictional): ${tenant.email}`,
    ``,
    `2. LEASE TERM (HALF-OPEN INTERVAL [START, END))`,
    `   Commencement Date (Inclusive): ${lease.startDate}`,
    `   Expiration Date (Exclusive):   ${lease.endDate}`,
    `   Current Lease Status:          ${lease.status}`,
    `   Billing Frequency:             ${lease.billingFrequency}`,
    ``,
    `3. FINANCIAL TERMS`,
    `   Scheduled Monthly Rent:        ${formatCurrency(lease.monthlyRent)}`,
    `   Security Deposit Requirement:  ${formatCurrency(lease.securityDeposit)}`,
    `   Monthly Payment Due Day:       Day ${lease.paymentDueDay} of each month`,
    ``,
    `4. OPERATIONAL NOTES`,
    `   ${lease.notes || 'Standard demonstration lease terms apply.'}`,
    ``,
    `5. DISCLAIMER`,
    `   ${watermark}`,
    `   No legally binding signature or real contract execution is provided.`,
  ];

  let y = 140;
  for (const line of lines) {
    doc.text(line, 40, y);
    y += 18;
  }

  const arrayBuffer = doc.output('arraybuffer');

  if (download && typeof window !== 'undefined') {
    doc.save(`${lease.code}-Sample-Lease.pdf`);
  }

  return {
    watermark,
    byteLength: arrayBuffer.byteLength,
    summaryText: lines.join('\n'),
  };
}

/**
 * Generates a Rent Receipt / Invoice PDF for a RentCharge or RentPayment.
 */
export function generateRentReceiptPdf(params: {
  charge: RentCharge;
  property: Property;
  unit: Unit;
  tenant: Tenant;
  payments: RentPayment[];
  companyName: string;
  download?: boolean;
}): { byteLength: number; summaryText: string } {
  const { charge, property, unit, tenant, payments, companyName, download = true } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  doc.setFillColor(20, 108, 99);
  doc.rect(0, 0, 612, 68, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('ESTAVIA — SAMPLE RENT INVOICE & RECEIPT', 40, 32);
  doc.setFontSize(9);
  doc.text('PORTFOLIO DEMONSTRATION DOCUMENT — NO REAL FUNDS TRANSFERRED', 40, 50);

  doc.setTextColor(28, 41, 39);
  doc.setFontSize(13);
  doc.text(`Invoice / Charge Reference: ${charge.code}`, 40, 104);

  doc.setFontSize(10);
  const lines = [
    `Invoice / Charge Code: ${charge.code}`,
    `Managing Organization: ${companyName}`,
    `Billing Period:        ${charge.billingPeriod}`,
    `Due Date:              ${charge.dueDate}`,
    `Invoice Status:        ${charge.status}`,
    ``,
    `Property:              ${property.name} (${property.code})`,
    `Unit:                  Unit ${unit.unitNumber}`,
    `Tenant:                ${tenant.fullName} (${tenant.code})`,
    ``,
    `FINANCIAL BREAKDOWN`,
    `------------------------------------------------------------`,
    `Total Scheduled Charge:    ${formatCurrency(charge.amount)}`,
    `Allocated Payments:        ${formatCurrency(charge.amountPaid)}`,
    `Credits Applied:           ${formatCurrency(charge.creditsApplied)}`,
    `Outstanding Balance:       ${formatCurrency(charge.balance)}`,
    `------------------------------------------------------------`,
    ``,
    `RECORDED PAYMENT ALLOCATIONS:`,
    ...(payments.length === 0
      ? ['  No payments recorded against this charge yet.']
      : payments.map(
          (p) =>
            `  • ${p.date} | ${p.code} | ${p.type} (${p.method}): ${formatCurrency(p.amount)}${
              p.isReversed ? ' [REVERSED]' : ''
            }`
        )),
  ];

  let y = 132;
  for (const line of lines) {
    doc.text(line, 40, y);
    y += 18;
  }

  const arrayBuffer = doc.output('arraybuffer');

  if (download && typeof window !== 'undefined') {
    doc.save(`${charge.code}-Rent-Receipt.pdf`);
  }

  return {
    byteLength: arrayBuffer.byteLength,
    summaryText: lines.join('\n'),
  };
}
