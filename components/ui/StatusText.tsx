'use client';

import React from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  ShieldAlert,
  Wrench,
} from 'lucide-react';

type StatusVariant =
  | 'Occupied'
  | 'Vacant'
  | 'Reserved'
  | 'Unavailable'
  | 'Under Maintenance'
  | 'Active'
  | 'Scheduled'
  | 'Draft'
  | 'Expired'
  | 'Terminated'
  | 'Cancelled'
  | 'Paid'
  | 'Partially Paid'
  | 'Unpaid'
  | 'Overdue'
  | 'Voided'
  | 'Approved'
  | 'Submitted'
  | 'Under Review'
  | 'Rejected'
  | 'Converted'
  | 'Pending'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Emergency'
  | 'New'
  | 'Reviewed'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Closed';

/**
 * Accessible status indicator that pairs explicit text + icon with semantic color
 * (never relying on color alone, and avoiding pill enclosures per design rules).
 */
export function StatusText({
  status,
  className = '',
}: {
  status: StatusVariant | string;
  className?: string;
}) {
  let colorClass = 'text-[#71807B] dark:text-[#9CB0AA]';
  let IconComponent = FileText;

  switch (status) {
    case 'Occupied':
    case 'Active':
    case 'Paid':
    case 'Approved':
    case 'Converted':
    case 'Resolved':
    case 'Closed':
    case 'Completed':
      colorClass = 'text-[#059669] dark:text-[#10B981]';
      IconComponent = CheckCircle2;
      break;
    case 'Vacant':
    case 'Scheduled':
    case 'Reserved':
    case 'Submitted':
    case 'Under Review':
    case 'Reviewed':
    case 'Assigned':
      colorClass = 'text-[#146C63] dark:text-[#5BC4B4]';
      IconComponent = KeyRound;
      break;
    case 'Partially Paid':
    case 'Unpaid':
    case 'Pending':
    case 'Medium':
    case 'In Progress':
    case 'New':
      colorClass = 'text-[#D97706] dark:text-[#F59E0B]';
      IconComponent = Clock;
      break;
    case 'Under Maintenance':
    case 'High':
      colorClass = 'text-[#D97706] dark:text-[#F59E0B]';
      IconComponent = Wrench;
      break;
    case 'Overdue':
    case 'Emergency':
    case 'Terminated':
    case 'Rejected':
      colorClass = 'text-[#DC2626] dark:text-[#EF4444]';
      IconComponent = AlertTriangle;
      break;
    case 'Unavailable':
    case 'Cancelled':
    case 'Voided':
    case 'Expired':
      colorClass = 'text-[#71807B] dark:text-[#9CB0AA]';
      IconComponent = Ban;
      break;
    default:
      IconComponent = ShieldAlert;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${colorClass} ${className}`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
